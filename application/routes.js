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
          surname: Joi.string(),
          lastname: Joi.string(),
          username: Joi.string().alphanum(),
          email: Joi.string().email(),
          password: Joi.string(),
          language: Joi.string()
        }).requiredKeys('username', 'email', 'password'),
      },
      tags: ['api'],
      description: 'Register a new user',
      response: {
        schema: Joi.object().keys({
          success: Joi.boolean(),
          userid: Joi.string().alphanum()
        })
      },
      auth: false
    }
  });

  //Create user - used by authorization service
  //returns new _id
  server.route({
    method: 'POST',
    path: '/create',
    handler: handlers.create,
    config: {
      validate: {
        payload: Joi.object().keys({
          email: Joi.string().email(),
          username: Joi.string().alphanum(),
          language: Joi.string()
        }).requiredKeys('email', 'username', 'language'),
      },
      tags: ['api'],
      description: 'Register a new user',
      response: {
        schema: Joi.object().keys({
          new_id: Joi.string().alphanum()
        })
      },
      auth: false
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
          username: Joi.string().alphanum(),
          password: Joi.string()
        })
      },
      tags: ['api'],
      description: 'Login',
      response: {
        schema: Joi.object().keys({
          access_token: Joi.string(),
          expires_in: Joi.number(),
          userid: Joi.string()
        })
      },
      auth: false
    }
  });

  //Get a user
  server.route({
    method: 'GET',
    path: '/user/{id}',
    handler: handlers.getUser,
    config: {
      validate: {
        params: {
          id: Joi.string().alphanum()
        }
      },
      tags: ['api'],
      description: 'Get user by id',
      auth: false
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
          id: Joi.string().alphanum()
        }
      },
      tags: ['api'],
      description: 'Delete a user - JWT needed',
      response: {
        schema: Joi.object().keys({
          success: Joi.boolean()
        })
      },
      auth: 'jwt'
    }
  });

  //Update a user with a new JSON representation
  server.route({
    method: 'PUT',
    path: '/user/{id}',
    handler: handlers.updateUser,
    config: {
      validate: {
        params: {
          id: Joi.string().alphanum()
        }
      },
      tags: ['api'],
      description: 'Update a user',
      response: {
        schema: Joi.object().keys({
          success: Joi.boolean(),
          userid: Joi.string()
        })
      },
      auth: false
    }
  });
};
