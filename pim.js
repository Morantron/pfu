#!/usr/bin/env node

var colors = require('colors');
var keypress = require('keypress');
var ttys = require('ttys');
var parseArgs = require('minimist');
var exec = require('child_process').exec;

var items = [];
var tree = [];
var KEYS = 'asdfqwerzxcv';

function indexToTrigger(index) {
  var trigger = "",
      radix = KEYS.length,
      Q = index, R;

  while (true) {
    R = Q % radix;
    trigger = KEYS.charAt(R) + trigger;
    Q = (Q - R) / radix;
    if (Q == 0) break;
  }

  return ((index < 0) ? "-" + trigger : trigger);
}


process.stdin.on('data', function (data) {
  items = items.concat(data.toString().split('\n'));
  items.pop();

  tree = items.map(function (value, index) {
    return {
      trigger: indexToTrigger(index)
    , value: value
    };
  });

  tree = tree.filter(function (value) {
    return value.trigger;
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

  input += key.name;

  var results = (tree.filter(function (item, i) {
    return item.trigger.startsWith(input);
  }) || []);

  if (results.length === 1) {
    doResult(results[0]);
  }
});
