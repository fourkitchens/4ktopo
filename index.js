'use strict';

const express = require('express');
const app = express();

const PageImageColorComparator = require('./lib/PageImageColorComparator');
const opts = {
  url: 'http://topodesigns.com/collections/bags',
  referenceColor: [53, 170, 78],
  colorImageSelector: 'main .color.options .color.available span',
  colorNameDataAttr: 'option-title'
};


app.get('/', function (req, res) {
  const comparator = new PageImageColorComparator(opts);
  comparator.getPage()
    .then(html => comparator.getColors(html))
    .then(colors => Promise.all(colors.map(color => comparator.checkColors(color))))
    .then(dEValues => dEValues.map(dE => comparator.evaluateColorCloseness(dE)))
    .then(closenessVals => {
      const closeColorExists = closenessVals.some(exists => exists);
      if (closeColorExists) {
        res.send('I can haz');        
      } else {
        res.send('Nope, not yet');        
      }
    })
    .catch(e => {
      res.sendStatus(500);
    });
});

app.listen(3000, function () {
  console.log('Listening on port 3000.');
});

