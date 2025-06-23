'use strict';

const env = require('./better-auth.DiSjtgs9.cjs');

function getIp(req, options) {
  if (options.advanced?.ipAddress?.disableIpTracking) {
    return null;
  }
  const testIP = "127.0.0.1";
  if (env.isTest) {
    return testIP;
  }
  const headers = "headers" in req ? req.headers : req;
  const defaultHeaders = ["x-forwarded-for"];
  const ipHeaders = options.advanced?.ipAddress?.ipAddressHeaders || defaultHeaders;
  for (const key of ipHeaders) {
    const value = "get" in headers ? headers.get(key) : headers[key];
    if (typeof value === "string") {
      const ip = value.split(",")[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }
  return null;
}
function isValidIP(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".").map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

exports.getIp = getIp;
