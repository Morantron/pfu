#!/usr/bin/env node

var colors = require('colors');
var keypress = require('keypress');
var ttys = require('ttys');
var parseArgs = require('minimist');
var exec = require('child_process').exec;
var ansiEscapes = require('ansi-escapes');

var items = [];
var tree = [];
var KEYS = 'sadfjklewcmpgh';

var input = '';
var waiting = false;
var timeout;

/**
 * Hinter magic blatantly ~~stolen~~ inspired by vimium.
 */
function buildHinter(charset, dataLength) {
  var char_map = charset.split('').reduce(function (map, digit, index) {
    map[index.toString(charset.length)] = charset[index];
    return map;
  }, {});

  var digitsNeeded = Math.ceil(Math.log(dataLength) / Math.log(charset.length))

  var shortHintCount = Math.floor(
    (Math.pow(charset.length, digitsNeeded) - dataLength)
    / charset.length
  );

  return function (n) {
    if (n > shortHintCount) {
      n = (shortHintCount + 1) * charset.length + (n - shortHintCount)
    }

    var hint = n.toString(charset.length).split('').map(function (digit) {
      return char_map[digit]
    }).join('');

    return hint;
  }
}

var printResults = (function () {
  var printed_lines = 0;
  var saved_position = false;

  function cursorSavePosition() {
    saved_position = true;
    process.stdout.write(ansiEscapes.cursorSavePosition);
  }

  function cursorRestorePosition() {
    saved_position = false;
    process.stdout.write(ansiEscapes.cursorRestorePosition);
  }

  function eraseLine() {
    process.stdout.write(ansiEscapes.eraseLine);
  }

  function cursorDown(i) {
    process.stdout.write(ansiEscapes.cursorDown(i));
  }

  function clearPrintedLines() {
    cursorRestorePosition();
    cursorSavePosition();

    for (var i = 0, len = printed_lines; i < len; i++) {
      cursorDown(1);
      eraseLine();
    }

    cursorRestorePosition();
    cursorSavePosition();
    printed_lines = 0;

    cursorRestorePosition();
  }

  return function (results, matching) {
    if (printed_lines > 0) {
      clearPrintedLines();
    }

    cursorSavePosition();

    results.forEach(function (item) {
      var trigger = ('[' + item.trigger + ']').green;
      process.stdout.write(trigger + ' ' + item.value + '\n');
      printed_lines++;
    });
  }
})();

process.stdin.on('data', function (data) {
  items = items.concat(data.toString().split('\n'));
  items.pop();

  var hinter = buildHinter(KEYS, items.length);

  tree = items.map(function (value, index) {
    return {
      trigger: hinter(index)
    , value: value
    };
  });

  printResults(tree);
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
    process.stdout.write(result.value + '\n');
    process.exit(0);
  }
}

ttys.stdin.on('keypress', function (ch, key) {
  waiting = false;

  if (timeout) {
    clearTimeout(timeout)
  }

  if (key.name === 'c' && key.ctrl) {
    process.exit();
  }

  input += key.name;

  var matching = new RegExp("^" + input);

  var results = (tree.filter(function (item, i) {
    return matching.test(item.trigger);
  }) || []);

  printResults(results);

  if (results.length === 1) {
    doResult(results[0]);
  } else if(results.length >= 1) {
    waiting = true;

    timeout = setTimeout(function () {
      if (waiting) {
        doResult(results[0]);
      }
    }, 500);
  }
});
