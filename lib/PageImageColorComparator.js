'use strict';

const request = require('request');
const cheerio = require('cheerio');
const colordiff = require('colordifference');
const vibrant = require('node-vibrant');

module.exports = class PageImageColorComparator {
  constructor({url, referenceColor, colorImageSelector}) {
    this.url = url;
    this.referenceColor = referenceColor;
    this.colorImageSelector = colorImageSelector;
  }

  getPage() {
    return new Promise((resolve, reject) => {
      request(this.url, (err, response, html) => {
        if (!err && response.statusCode === 200) {
          return resolve(html);
        }
        return reject(err);
      });
    });
  }

  getColors(html) {
    const $ = cheerio.load(html);
    const promises = [];
    const colorUrls = [];

    // Get all "available color" badges.
    $(this.colorImageSelector)
      .each(function pushUrls() {
        const bgImgUrl = $(this).css('background-image');
        // Get actual url from CSS property value.
        colorUrls.push(/^url\((['"]?)(.*)\1\)$/.exec(bgImgUrl)[2]);
      });

    colorUrls
      .filter((url, i, array) => array.indexOf(url) === i)
      .forEach(url => {
        promises.push(new Promise((resolve, reject) => {
          // Get palette of colors from image.
          vibrant.from(`http:${url}`).getPalette((err, palette) => {
            if (err) {
              return reject(err);
            }
            return resolve(palette);
          });
        }));
      });

    return Promise.all(promises);
  }

  checkColors(palette) {
    // Check all colors in the palette for closeness to 4K brand green.
    return Promise.all(Object.keys(palette)
      .filter(name => palette.hasOwnProperty(name) && palette[name])
      .map(name => new Promise((resolve, reject) => {
        colordiff(this.referenceColor, palette[name].rgb, (err, dE) => {
          if (err) {
            return reject(err);
          }
          return resolve(dE);
        });
      })));
  }

  evaluateColorCloseness(dE) {
    return dE < 5;
  }
};
