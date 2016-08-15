/*
Each route implementes a basic parameter/payload validation and a swagger API documentation description
*/
'use strict';

const Joi = require('joi'),
  handlers = require('./controllers/handler');

module.exports = function (server) {
  //Register new user with credentials
  server.route({
    method: 'POST',
    path: '/register',
    handler: handlers.register,
    config: {
      validate: {
        payload: Joi.object().keys({
          forename: Joi.string().allow('').optional(),
          surname: Joi.string().allow('').optional(),
          username: Joi.string().alphanum(),
          email: Joi.string().email(),
          password: Joi.string(),
          language: Joi.string()
        }).requiredKeys('username', 'email', 'password', 'language'),
      },
      tags: ['api'],
      description: 'Register a new user with unique username and email',
      response: {
        schema: Joi.object().keys({
          userid: Joi.number().integer()
        })
      },
      auth: false,
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
              'headers': {
                '----jwt----': {
                  'description': 'Contains the JWT'
                }
              }
            },
            ' 422 ': {
              'description': 'Wrong user data - see error message',
              schema: Joi.object().keys({
                statusCode: Joi.number().integer(),
                error: Joi.string(),
                message: Joi.string()
              }).required()
            }
          },
          payloadType: 'form'
        }
      }
    }
  });

  //Login with credentials
  server.route({
    method: 'POST',
    path: '/login',
    handler: handlers.login,
    config: {
      validate: {
        payload: Joi.object().keys({
          email: Joi.string().email(),
          password: Joi.string()
        })
      },
      tags: ['api'],
      description: 'Login',
      auth: false,
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
              'headers': {
                '----jwt----': {
                  'description': 'Contains the JWT'
                }
              },
              schema: Joi.object().keys({
                access_token: Joi.string(),
                expires_in: Joi.number(),
                userid: Joi.number().integer(),
                username: Joi.string()
              }).required()
            },
            ' 401 ': {
              'description': 'The credentials are wrong',
              'headers': {
                'WWW-Authenticate': {
                  'description': '{"email":"", "password": ""}'
                }
              }
            }
          },
          payloadType: 'form'
        }
      }
    }
  });

  //Get a user
  server.route({
    method: 'GET',
    path: '/user/{id}/profile',
    handler: handlers.getUser,
    config: {
      validate: {
        params: {
          id: Joi.number().integer().options({convert: true})
        },
        headers: Joi.object({
          '----jwt----': Joi.string().required().description('JWT header provided by /login')
        }).unknown()
      },
      tags: ['api'],
      description: 'Get detailed information about a user by id - JWT needed',
      auth: 'jwt',
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
            },
            ' 401 ': {
              'description': 'Not authorized to access another users profile',
              'headers': {
                'WWW-Authenticate': {
                  'description': 'Use your JWT token and the right userid.'
                }
              }
            },
            ' 404 ': {
              'description': 'User not found. Check the id.'
            }
          },
          payloadType: 'form'
        }
      }
    }
  });

  //Delete user
  server.route({
    method: 'DELETE',
    path: '/user/{id}',
    handler: handlers.deleteUser,
    config: {
      validate: {
        params: {
          id: Joi.number().integer().options({convert: true})
        },
        headers: Joi.object({
          '----jwt----': Joi.string().required().description('JWT header provided by /login')
        }).unknown()
      },
      tags: ['api'],
      description: 'Delete a user - JWT needed',
      auth: 'jwt',
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
            },
            ' 401 ': {
              'description': 'Not authorized to delete another user.',
              'headers': {
                'WWW-Authenticate': {
                  'description': 'Use your JWT token and the right userid.'
                }
              }
            },
            ' 404 ': {
              'description': 'User not found. Check the id.'
            }
          },
          payloadType: 'form'
        }
      }
    }
  });

  //User Profile

  //Update a users password
  server.route({
    method: 'PUT',
    path: '/user/{id}/passwd',
    handler: handlers.updateUserPasswd,
    config: {
      validate: {
        params: {
          id: Joi.number().integer().options({convert: true})
        },
        payload: Joi.object().keys({
          oldPassword: Joi.string(),
          newPassword: Joi.string()
        }),
        headers: Joi.object({
          '----jwt----': Joi.string().required().description('JWT header provided by /login')
        }).unknown()
      },
      tags: ['api'],
      description: 'Update a users password - JWT needed',
      auth: 'jwt',
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
            },
            ' 401 ': {
              'description': 'Not authorized to change the password of another user.',
              'headers': {
                'WWW-Authenticate': {
                  'description': 'Use your JWT token and the right userid.'
                }
              }
            },
            ' 404 ': {
              'description': 'User not found. Check the id.'
            }
          },
          payloadType: 'form'
        }
      }
    }
  });

  //Update a users profile with the given JSON representation
  server.route({
    method: 'PUT',
    path: '/user/{id}/profile',
    handler: handlers.updateUserProfile,
    config: {
      validate: {
        params: {
          id: Joi.number().integer().options({convert: true})
        },
        payload: Joi.object().keys({
          email: Joi.string().email(),
          username: Joi.string().alphanum(),
          surname: Joi.string().allow('').optional(),
          forename: Joi.string().allow('').optional(),
          //sex: Joi.string(),  //not used right now
          language: Joi.string(),
          country: Joi.string().allow('').optional(),
          picture: Joi.string().uri().allow('').optional(),
          description: Joi.string().allow('').optional(),
          organization: Joi.string().allow('').optional()
        }).requiredKeys('email', 'username', 'language'),
        headers: Joi.object({
          '----jwt----': Joi.string().required().description('JWT header provided by /login')
        }).unknown()
      },
      tags: ['api'],
      description: 'Update a user - JWT needed',
      auth: 'jwt',
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
            },
            ' 401 ': {
              'description': 'Not authorized to update another users profile.',
              'headers': {
                'WWW-Authenticate': {
                  'description': 'Use your JWT token and the right userid.'
                }
              }
            },
            ' 404 ': {
              'description': 'User not found. Check the id.'
            },
            ' 422 ': {
              'description': 'The new email adress is already taken by another user.'
            }
          },
          payloadType: 'form'
        }
      }
    }
  });

  //Get a user
  server.route({
    method: 'GET',
    path: '/user/{identifier}',
    handler: handlers.getPublicUser,
    config: {
      validate: {
        params: {
          identifier: Joi.string().description('Could be the id as integer or the username as string')
        }
      },
      tags: ['api'],
      description: 'Get public information about a user by id',
      auth: false,
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
            },
            ' 404 ': {
              'description': 'User not found. Check the id.'
            }
          },
          payloadType: 'form'
        }
      }
    }
  });

  //Check if username is already taken
  server.route({
    method: 'GET',
    path: '/information/username/{username}',
    handler: handlers.checkUsername,
    config: {
      validate: {
        params: {
          username: Joi.string()
        }
      },
      tags: ['api'],
      description: 'Checks if username exists already',
      response: {
        schema: Joi.object().keys({
          taken: Joi.boolean().required(),
          alsoTaken: Joi.array().items(Joi.string()).required()
        }).required()
      },
      auth: false,
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
            }
          },
          payloadType: 'form'
        }
      }
    }
  });

  //Check if email is already in use
  server.route({
    method: 'GET',
    path: '/information/email/{email}',
    handler: handlers.checkEmail,
    config: {
      validate: {
        params: {
          email: Joi.string().email()
        }
      },
      tags: ['api'],
      description: 'Checks if email is already in use',
      response: {
        schema: Joi.object().keys({
          taken: Joi.boolean().required()
        }).required()
      },
      auth: false,
      plugins: {
        'hapi-swagger': {
          responses: {
            ' 200 ': {
              'description': 'Successful',
            }
          },
          payloadType: 'json'
        }
      }
    }
  });
};
