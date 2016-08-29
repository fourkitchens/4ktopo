'use strict';

const express = require('express');
const cache = require('memory-cache');
const config = require('config');
const PageImageColorComparator = require('./lib/PageImageColorComparator');

const app = express();
const questionText = `Does Topo have ${config.get('companyName')} #onbrand backpacks yet?`;
const brandColor = config.get('brandColorRGBArray');
const opts = {
  url: 'http://topodesigns.com/collections/bags',
  referenceColor: brandColor,
  colorImageSelector: 'main .color.options .color.available span'
};

function template(text) {
  return `
  <html>
    <head>
      <style>
        body {
          text-align: center;
          background-color: rgb(${brandColor[0]},${brandColor[1]},${brandColor[2]});
          margin-top: 7rem;
          font-size: 1.5rem;
          color: white;
          font-family: Arial;
        }
        body p {
          font-size: 2rem;
        }
      </style>
    </head>
    <body>
    <h1>${questionText}</h1>
    <p>${text}</p>
    </body>
  </html>`;
}

function existsResponse(exists, res) {
  if (exists) {
    res.send(template('OMG OMG OMG. Finally!'));
  }
  else {
    res.send(template('Nope, not yet'));
  }
}

app.get('/', (req, res) => {
  const comparator = new PageImageColorComparator(opts);
  const exists = cache.get('exists');
  if (exists === null) {
    comparator.getPage()
      .then(html => comparator.getColors(html))
      .then(colors => Promise.all(colors.map(color => comparator.checkColors(color))))
      .then(dEValues => dEValues.map(dE => comparator.evaluateColorCloseness(dE)))
      .then(closenessVals => {
        const closeColorExists = closenessVals.some(val => val);
        cache.put('exists', closeColorExists, 240000);
        existsResponse(closeColorExists, res);
      })
      .catch(() => {
        res.status(500).send(template('Something broke!'));
      });
  }
  else {
    existsResponse(exists, res);
  }
});

app.listen(process.env.PORT || 5000);
