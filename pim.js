#!/usr/bin/env node

var colors = require('colors');
var keypress = require('keypress');
var ttys = require('ttys');
var parseArgs = require('minimist');
var exec = require('child_process').exec;

var items = [];
var tree = [];
var HOMEROW_KEYS = 'asdfqwerzxcv';

function getTriggerSequence(choices_size, index) {
  var sequence = '';
  var len = Math.ceil(choices_size / HOMEROW_KEYS.length);

  for (var i = 0; i < len; i++) {
    sequence += HOMEROW_KEYS[(index + i) % HOMEROW_KEYS.length]
  }

  return sequence;
}

process.stdin.on('data', function (data) {
  items = items.concat(data.toString().split('\n'));
  items.pop();

  tree = items.map(function (value, index) {
    return {
      trigger: getTriggerSequence(items.length, index)
    , value: value
    };
  });

  tree = tree.filter(function (value, index) {
    return index <= HOMEROW_KEYS.length;
  });

  tree.forEach(function (item) {
    var trigger = ('[' + item.trigger + ']').green;
    process.stdout.write(trigger + ' ' + item.value + '\n');
  });
});

keypress(ttys.stdin);
ttys.stdin.setRawMode(true);
ttys.stdin.resume();

var args = parseArgs(process.argv, {'e': ['exec']})

var options = {
  exec: args.e
}

function doResult(result) {
  if (options.exec) {
    var command = options.exec.replace('{}', result.value);
    exec(command, function (error, stdout, stderr) {
      if (error) {
        process.stderr.write(stderr);
        process.exit(1);
      }

      process.stdout.write(command + '\n');
      //TODO pipe output and exit code
      process.stdout.write(stdout);
      process.exit(0);
    });
  } else {
    process.stdout.write(result.value);
    process.exit(0);
  }
}

var input = '';

ttys.stdin.on('keypress', function (ch, key) {
  if (key.name === 'c' && key.ctrl) {
    process.exit();
  }

  if (key.name === 'escape') {
    input = '';
    return;
  }

  if (HOMEROW_KEYS.indexOf(key.name) < 0) {
    return;
  }

  input += key.name;

  var results = (tree.filter(function (item, i) {
    return item.trigger === input;
  }) || []);

  if (results.length === 1) {
    doResult(results[0]);
  //} else if (results.length === 0 ){
    //input = '';
  }
});
