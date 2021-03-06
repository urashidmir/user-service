'use strict';

console.log('This script will read userids from the given file and suspend them one after another.');

const config = require('../configuration'),
  userCtrl = require('../database/user'),
  jwt = require('../controllers/jwt'),
  async = require('async'),
  request = require('request-promise-native'),
  helper = require('../database/helper'),
  COLLECTION_SUSPENDEDUSERIDS = 'useridsforsuspension';

let deckidsToUserids = {};

// generate a `isReviewer` jwt the deck service will accept  
const adminToken = jwt.createToken({
  _id: -1,
  username: 'system',
  isReviewer: true,
});

console.log('First the userids are read.');
let linePromises = [];

helper.connectToDatabase()
  .then((dbconn) => dbconn.collection(COLLECTION_SUSPENDEDUSERIDS))
  .then((collection) => collection.find())
  .then((cursor) => cursor.toArray())
  .then((array) => {
    if (array.length === 0) {
      console.log('No users found. Exit.');
      process.exit(0);
    }

    array.forEach((user) => {
      let userid = user._id;

      console.log('Got userid:', userid);

      deckidsToUserids[userid] = [];
    });

    suspendUsers();
  });

function archiveDeck(deckid, authToken, reason='spam', comment) {
  // console.log('archiveDeck(', deckid);
  const headers = {};
  headers[config.JWT.HEADER] = authToken;

  const options = {
    url: require('../configs/microservices').deck.uri + '/decktree/'+parseInt(deckid)+'/archive',
    method: 'POST',
    json: true,
    body: {
      secret: process.env.SECRET_REVIEW_KEY,
      reason: reason,
      comment: comment,
    },
    headers: headers,
  };

  if (process.env.NODE_ENV === 'test') {
    return Promise.resolve(deckid);
  }
  else
    return request(options)
      .then((response) => {
        console.log('archiveDeck '+deckid+':', response === undefined ? 'success' : response);
        return deckid;
      })
      .catch((error) => {
        console.log('archiveDeck Error '+deckid+':', error.statusCode, error.message);
        console.log(options);
        return;
      });
}

function suspendUsers() {
  console.log('Finished reading userids.');
  console.log('Count of correct userids read: ', Object.keys(deckidsToUserids).length);

  console.log('\nNow suspending users and decks');
  async.eachOfSeries(Object.keys(deckidsToUserids), (ui, key, callback) => {
    let userid = parseInt(ui);

    console.log('\nNow its userid ', userid);

    //remove user from usergroups
    helper.connectToDatabase()
      .then((dbconn) => dbconn.collection('usergroups'))
      .then((collection) => collection.update({'members.userid': userid}, {
        $pull: {
          members: {
            userid: userid
          }
        }}))
      .then((result) => {
        if (result.result.ok !== 1)
          console.log('Could not remove user from the groups:', result);

        console.log('Updated usergroups:', result.result);
      })
      .catch((error) => {
        console.log('Error while updating usergroups:', error);
      });
    //delete usergroups where user is creator
    helper.connectToDatabase()
      .then((dbconn) => dbconn.collection('usergroups'))
      .then((collection) => collection.deleteMany({$or: [{'creator.userid': userid}, {creator: userid}]}))
      .then((result) => {
        if (result.result.ok !== 1) {
          console.log('Could not remove usergroup:', result);
          return;
        }

        console.log('Deleted usergroups:', result.result.n);

        if (result.result.n < 1) {
          console.log('Could not remove usergroup:', result.result);
          return;
        }
      })
      .catch((error) => {
        console.log('Error while deleting usergroups:', error);
      });


    //suspend user and decks
    let query = {
      _id: userid,
      suspended: {
        $not: {
          $eq: true
        }
      }
    };
    let update = {
      $set: {
        reviewed: true,
        suspended: true
      }
    };
    userCtrl.partlyUpdate(query, update)
      .then((result) => {
        if (result.result.ok === 1 && result.result.n === 1) {
          //found user and got updated

          //now archive all the decks of the user
          const options = {
            url: require('../configs/microservices').deck.uri + '/decks',
            method: 'GET',
            qs: {
              user: userid,
              // only get the root decks, subdecks cannot be directly archived
              rootsOnly: true,
              // only return the _id attribute,
              idOnly: true,
            },
            json: true
          };

          if (process.env.NODE_ENV === 'test') {
            return callback();
          }
          else
            request(options)
              .then((response) => {
                console.log('userid '+userid+', root decks: ', response);

                async.eachOfSeries(response, (deck, key, callback2) => {
                  archiveDeck(deck._id, adminToken, 'spam')
                    .then((deckid2) => {
                      deckidsToUserids[userid].push(deckid2);
                      callback2();
                    })
                    .catch((error) => {
                      console.log('Error:', error);
                      callback2();
                    });
                },  (error) => {
                  if (error)
                    console.log('async Error:', error);
                  callback();
                });
              })
              .catch((error) => {
                console.log('response Error', error.statusCode, error.message);
                callback();
              });
        }
        else {
          console.log('Problem with user query:', query, result.result);

          callback();
          return;
        }
      })
      .catch((error) => {
        console.log('Error', error);
        callback();
      });
  },  (error) => {
    if (error)
      console.log('async Error:', error);

    let message = '';
    for (let k in deckidsToUserids) {
      let deckids = deckidsToUserids[k].reduce((s, c) => {return s + ', ' + c;}, '');
      message += k + ' [' + deckids + '], \n';
    }

    console.log('\nHere are all the userids of the suspended users with their suspended decks:\n', message);

    console.log('\n\nAt the end, suspended users have to be removed from the queue if they are already there.');
    let query = {$or: Object.keys(deckidsToUserids).reduce((arr, curr) => {
      arr.push({userid: parseInt(curr)});
      return arr;
    }, [])};
    // console.log(query);
    helper.connectToDatabase()
      .then((dbconn) => dbconn.collection('reviewable_users'))
      .then((collection) => collection.remove(query))
      .then((result) => {
        console.log('deleted from queue', result.result);

        return helper.connectToDatabase()
          .then((dbconn) => dbconn.collection(COLLECTION_SUSPENDEDUSERIDS))
          .then((collection) => collection.drop())
          .then((result) => {
            console.log('Also dropped '+COLLECTION_SUSPENDEDUSERIDS);
            process.exit(0);
          })
          .catch((err) => {
            console.log('Error while droppping '+COLLECTION_SUSPENDEDUSERIDS, err);
            process.exit(0);
          });
      })
      .catch((err) => {
        console.log('Error', err);
        process.exit(0);
      });
  });
}
