# User Management Service #
[![Build Status](https://travis-ci.org/slidewiki/user-service.svg?branch=master)](https://travis-ci.org/slidewiki/user-service)
[![License](https://img.shields.io/badge/License-MPL%202.0-green.svg)](https://github.com/slidewiki/microservice-template/blob/master/LICENSE)
[![Language](https://img.shields.io/badge/Language-Javascript%20ECMA2015-lightgrey.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Framework](https://img.shields.io/badge/Framework-NodeJS%206.11.0-blue.svg)](https://nodejs.org/)
[![Webserver](https://img.shields.io/badge/Webserver-Hapi%2016.4.0-blue.svg)](http://hapijs.com/)

This service manages the user accounts in terms of CRUD operations with their credentials, information and groups.
Also there are routes for handling social login with facebook, google and github, via OAuth2.

## API

See https://userservice.experimental.slidewiki.org/documentation

## JWT

This service creates JWTs which are used for authentication and authorization on specific routes of this and also other services, like deck- and file-service.
Inside JWT is the creation date and other metadata plus the following JSON: {userid, username}
This data is read by the services on each route on which jwt is activated.
The environment variable JWT_SERIAL sets the hash which is used to encrypt data with HS512 as JWT.
All services which want to use these JWTs have to use the same key and algorithm.
This will be replaced with OAuth2 in the future.

## Side effects

The docker container of this services uses supervisord in order to run the NodeJS application and doing a periodically cleanup of the database (only collections which are in the domain of this service) in parallel.

## Social login

Using the SlideWiki platform to start social login, this service gets the tokens (via the grant npm package) and manages them (stored in the MongoDB).
These social logins are used to sign up or sign in a SlideWiki user.
As this service communicates with the social providers in order to fulfill the OAuth2 workflow and request user information, the credentials for the providers are stored in the application/config.json file.
application/config.tpl is a template of such a configuration file - there are just the identifiers and secrets missing.
In order to get these identifiers and secrets, for each provider an application must be created, activated for OAuth2 and configured for the target domain:

* Facebook: https://developers.facebook.com/
* Github: Under /settings/applications of your organization or repository
* Google: https://console.developers.google.com

In there the allowed callback URLs have to be defined.
Their structure is: http(s)://your.domain.ending/connect/providername/callback , e.g. https://userservice.experimental.slidewiki.org/connect/github/callback

## Mail

This service tries to send emails after registration and password reset.
The SMTP configuration for it is read from the environment variables of the container.
See [docker-compose.yml](https://github.com/slidewiki/user-service/blob/master/docker-compose.yml) for all variables.

The emails send follow the SMTP protocol and contain the headers *From, To, Subject* and *Date*.
The text of the emails have to be changed in the code.

While executing unit/integration tests the env *testing* is set, which disables sending emails.

## Scripts

*All script are also available in the [migration](https://github.com/slidewiki/migration) repo.*
* [db_migration_hashing.js](https://github.com/slidewiki/user-service/blob/master/application/db_migration_hashing.js): Is used for the migration of the old slidewiki.org to the new one. It hashes the passwords regarding our new hashing policies.
* [db_migration_usernames.js](https://github.com/slidewiki/user-service/blob/master/application/db_migration_usernames.js): Is used for migration of the old slidewiki and combining multiple user datasets. It handles duplication of usernames and set all email addresses to lower case.
* [deckids_import.sh](https://github.com/slidewiki/user-service/blob/master/application/queue/deckids_import.sh): import to a database a list with deck ids from a file to the useridsforsuspension collection in order to call the next script to suspend them. Usage; `deckids_import.sh <database> <filetoimport>`, both options are required and in that order. Needs a mongoDB environment ( `mongoimport` and  `mongo` command line tool).
* [suspend_users.js](https://github.com/slidewiki/user-service/blob/master/application/queue/suspend_users.js): suspend users and their decks plus groups which have their id in the *useridsforsuspension* collection - See section SPAM handling

## SPAM handling

With the platform a process detects SPAM'ish users and add their id to the *useridsforsuspension* collection.
This collection could also be filled by hand.
These userids are used by [suspend_users.js](https://github.com/slidewiki/user-service/blob/master/application/queue/suspend_users.js).
This script sets each user as suspended and delete the corresponding user groups and also archives the owned decks.
Atm the script have to be called by hand but could be added to the crontab. It does not require any user credentias or JWT, as long as the `JWT_SERIAL` env variable when running it is set, and is the same as in the deckservice that holds the decks that will be archived during user suspension.

### Review process

Crontab updates the list of users (*reviewable_users* collection) for the manual review process every night.
Besides this costly process we add userids to list list of suspenable users (*useridsforsuspension* collection) per script (not in this repo) on demand in order to speed up the process.
In every case the script [suspend_users.js](https://github.com/slidewiki/user-service/blob/master/application/queue/suspend_users.js) has to be called manually by the administrator.

### How to add a user to the suspension list:

Connect to the Mongo shell and add the userid:

*db.useridsforsuspension.insert({_id: *userid*})*

### How to execute the script

Run

*node queue/suspend_users.js \<JWT>*

The JWT have to be a valid token of a users which is a reviewer.

## Installation and running (in a container, works both on UNIX and Windows):

### ENV

There are multiple environment variables which have to be changed for deployment.
Most of them are obligatory to be changed on deployment, especially keys and secrets (serial named here - sorry for the fault).

* APPLICATION_PORT
* DATABASE_PORT
* DATABASE_URL
* VIRTUAL_HOST - needed by NodeJS
* LETSENCRYPT_HOST - needed by JWilder nginx proxy
* LETSENCRYPT_EMAIL - needed by JWilder nginx proxy
* SMTP_PORT
* SMTP_HOST
* SMTP_FROM
* SMTP_CLIENTNAME - optional
* SMTP_ENABLED - have to be *true* to be enabled or something else to be disabled; it deactivates sending of emails
* APIKEY - secret between platform and user-service (for resetting users passwords)
* JWT_SERIAL - secret used for encrypt and decrypt JWTs
* SECRET_REVIEW_KEY - used for internal user review process only
* URL_PLATFORM - URL of the platform of the used domain/stage
* SERVICE_URL_ACTIVITIES - URL of the activities-service of the used domain/stage
* SERVICE_URL_DECK - URL of the deck-service of the used domain/stage
* SERVICE_URL_FILE - URL of the file-service of the used domain/stage
* LTI_ID - ask Umar
* LTI_KEY - ask Umar
* LTI_SECRET - ask Umar

New secret could be created with the command:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'));"

### How to

1. git clone https://github.com/slidewiki/user-service
2. cd user-service/
3. docker build -t test-user-service .
4. docker run -d --name mongodb mongo
5. docker run -it --rm -p 8880:3000 test-user-service
6. the service will be available at localhost:8880 with the documentation available at localhost:8880/documentation
