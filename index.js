require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const bodyParser = require("body-parser");
const urlparser = require('url');
const { Console } = require('console');
const { is } = require('express/lib/request');
const mongoose = require('mongoose');
const app = express();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("we're connected!");
});

var urlSchema = new mongoose.Schema({
  id: Number,
  url: String
});

var urlModel = mongoose.model("url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/api/shorturl', function (req, res) {
  //var urlRegex = /https:\/\/www.|http:\/\/www./g;
  var urlRegex = /https:\/\/|http:\/\//g;
  var originalURL = req.body.url;
  var shortURL = "placeholder";
  var isValidURL = originalURL.match(urlRegex);

  //dns.lookup(originalURL.replace(urlRegex, ""), (err, address, family) => {
  
  console.log(urlparser.parse(originalURL).hostname);

  if (!isValidURL){
    res.json({ error: 'invalid url' });
  } else {
    dns.lookup(urlparser.parse(originalURL).hostname, (err, address, family) => {
      if (err) {
        res.json({ "error": "invalid url" });
      } else {
        var dbLength = 0;
  
        urlModel.find({}, function(err, docs) {
          dbLength = docs.length;
        });
  
        urlModel.findOne({url: originalURL})
          .exec()
          .then((docs)=>{
            // if url found
            if (docs) {
              shortURL = docs.id;
              //console.log("URL FOUND: " + docs.url);
              res.json({
                original_url: originalURL,
                short_url: shortURL.toString()
              });
            } else {
              // if url not found
              var newURL = new urlModel({
                id: dbLength + 1,
                url: originalURL
              });
              
              //console.log("URL NOT FOUND: " + newURL.url);
  
              newURL.save(function(err, result) {
                if (err) {
                  console.log(err);
                } else {
                  res.json({
                    original_url: newURL.url,
                    short_url: newURL.id.toString()
                  });
                }
              });
            }
        });

      }
    });
  }
});

app.get('/api/shorturl/:short_url', function (req, res) {
  
  var shortURLInput = req.params.short_url;

  if (!isNaN(shortURLInput)) {
    urlModel.findOne({ id: shortURLInput })
    .exec()
    .then(url => {
      if (url) {
        console.log(url);
        res.redirect(url["url"]);
      } else {
        res.json({ error: 'invalid url' });
      }
  
    });
  } else {
    res.json({ error: 'invalid url' });
  }
});
    

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
