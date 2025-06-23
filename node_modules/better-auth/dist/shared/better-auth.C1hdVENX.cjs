'use strict';

const getDate = (span, unit = "ms") => {
  return new Date(Date.now() + (unit === "sec" ? span * 1e3 : span));
};

exports.getDate = getDate;
