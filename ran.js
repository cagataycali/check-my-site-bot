const cloudscraper = require('cloudscraper');
const url = require('url');
const http = require('http');
const https = require('https');
const request = require('request');


module.exports =  (uri, callback) => {
  request(uri,  (error, response, body) => {
    if (!error && response.statusCode == 200) {
      callback(null, true)
    } else {
      let isCf = false;
      response.rawHeaders.forEach((value) => {
        if (value === 'cloudflare-nginx') {
          isCf = true;
        }
      })

      if (isCf) {
        cloudscraper.get(uri, (error, response, body) => {
          if (error) {
            console.log(error);
          } else {
            if (body) {
              callback(null, true)
            } else {
              callback(false, null)
            }
          }
        })
      } else {
        callback(false, null);
      }
    }
  });
};
