var game = {
  staticHost: 'http://rafaelcastrocouto.github.io/foda/client/',
  dynamicHost: 'https://foda-app.herokuapp.com/',
  container: $('.game-container'),
  loader: $('<span>').addClass('loader'),
  message: $('<span>').addClass('message'),
  triesCounter: $('<small>').addClass('triescounter'),
  dayLength: 12, // hours = game.time % (game.dayLength * 2)
  defaultSpeed: 3,
  maxSkillCards: 10,
  tries: 0,
  timeToPick: 40,//seconds
  timeToPlay: 99,
  waitLimit: 10,
  connectionLimit: 30,
  deadLength: 3, //turns
  ultTurn: 4,
  creepTurn: 1,
  catapultTurn: 8,
  treeRespawn: 4,
  heroDeathDamage: 4, //HP
  //heroRespawnDamage: 1,
  //creepDeathDamage: 1,
  fountainHeal: 12,
  heroBounty: 150, //money
  unitBounty: 50,
  jungleFarm: 50,
  maxMoney: 99999,
  width: 13, //map
  height: 7,
  seed: 0,
  id: null,
  timeoutArray: [],
  skills: {},
  data: {},//json {heroes, skills, ui, units, campaign}
  mode: '', //online, tutorial, single, library
  currentData: {}, // all game info and moves. should be able to recreate a table
  currentState: 'noscript', //unsupported, loading, log, menu, campaign, choose, vs, table, results
  heroesAI: {}, // heroes default AI behaviour
  build: function() {
    game.utils();
    game.history.build();
    game.events.build();
    game.hidden = $('<div>').addClass('hidden').appendTo(game.container);
    game.overlay = $('<div>').addClass('game-overlay hidden').appendTo(game.container);
    game.topbar = $('<div>').addClass('topbar');
    game.topbar.append(game.loader, game.message, game.triesCounter);
  },
  start: function() {
    if (window.JSON && window.localStorage && window.btoa && window.atob && window.XMLHttpRequest) {
      if (game.debug) {
        game.container.addClass('debug');
        game.staticHost = '';
        game.dynamicHost = '';
      }
      game.states.changeTo('loading');
      game.build();
    } else
      game.states.changeTo('unsupported');
  },
  newId: function() {
    game.newSeed();
    game.id = btoa(game.seed) + '|' + btoa(new Date().valueOf());
  },
  setId: function(id) {
    game.id = id;
    game.setSeed(id);
  },
  newSeed: function() {
    game.seed = Math.floor(Math.random() * 1E16);
    game.setData('seed', game.seed);
  },
  setSeed: function(id) {
    //console.trace(id);
    if (id) {
      var n = id.split('|');
      if (n[0].length) {
        game.seed = parseInt(atob(n[0]), 10);
        game.setData('seed', game.seed);
      }
    }
  },
  setData: function(item, data) {
    game.currentData[item] = data;
    localStorage.setItem('data', JSON.stringify(game.currentData));
  },
  getData: function(item) {
    if (!game.currentData[item]) {
      var saved = localStorage.getItem('data');
      if (saved) game.currentData = JSON.parse(saved);
    }
    return game.currentData[item];
  },
  canPlay: function () {
    var can = (game.currentTurnSide == 'player');
    if (game.mode == 'local') can = game.currentTurnSide;
    return can;
  },
  opponent: function(side) {
    return (side == 'player') ? 'enemy' : 'player';
  },
  db: function(send, cb, str) {
    var server = game.dynamicHost + 'db';
    if (game.debug)
      server = '/db';
    if (typeof send.data !== 'string') {
      send.data = JSON.stringify(send.data);
    }
    $.ajax({
      async: true,
      type: 'GET',
      url: server,
      data: send,
      complete: function(receive) {
        var data;
        if (cb && receive && receive.responseText) {
          if (str) cb (receive.responseText);
          else cb(JSON.parse(receive.responseText));
        }
      }
    });
  },
  random: function() {
    game.seed += 1;
    return parseFloat('0.' + Math.sin(game.seed).toString().substr(6));
  },
  validModes: ['tutorial', 'online', 'library', 'single', 'local'],
  setMode: function(mode, recover) {
    if (mode && game[mode] && game[mode].build && game.validModes.indexOf(mode) >= 0) {
      game.mode = mode;
      game.setData('mode', mode);
      game.container.removeClass(game.validModes.join(' '));
      game.container.addClass(mode);
      game[mode].build(recover);
    }
  },
  matchClear: function () {
    game.recovering = false;
    game.player.picks = false;
    game.enemy.picks = false;
    game.setData('challenger', false);
    game.setData('challenger', false);
    game.setData('challenged', false);
    game.setData('challengerDeck', false);
    game.setData('challengedDeck', false);
    game.setData('matchData', false);
    game.setData('seed', false);
  },
  clear: function() {
    game.message.html('');
    if (game.mode && game[game.mode] && game[game.mode].clear) {
      game[game.mode].clear();
    }
    game.states.choose.clear();
    game.states.vs.clear();
    game.states.table.clear();
    game.states.result.clear();
    game.container.removeClass(game.validModes.join(' '));
    game.mode = false;
    game.setData('mode', false);
  },
  alert: function(txt, cb) {
    var box = $('<div>').addClass('box');
    game.overlay.removeClass('hidden').append(box);
    box.append($('<h1>').text(game.data.ui.warning));
    box.append($('<p>').text(txt));
    box.append($('<div>').addClass('button').text(game.data.ui.ok).on('mouseup touchend', function () {
      game.overlay.addClass('hidden');
      game.overlay.empty();
      if (cb) cb(true);
      return false;
    }));
  },
  confirm: function(cb, text) {
    var box = $('<div>').addClass('box');
    game.overlay.removeClass('hidden').append(box);
    box.append($('<h1>').text(text || game.data.ui.sure));
    box.append($('<div>').addClass('button alert').text(game.data.ui.yes).on('mouseup touchend', function () {
      game.overlay.addClass('hidden');
      game.overlay.empty();
      cb(true);
      return false;
    }));
    box.append($('<div>').addClass('button').text(game.data.ui.no).on('mouseup touchend', function () {
      game.overlay.addClass('hidden');
      game.overlay.empty();
      cb(false);
      return false;
    }));
  },
  error: function(details, cb) {
    var box = $('<div>').addClass('box error');
    game.overlay.removeClass('hidden').append(box);
    var ti = 'Error';
    var re = 'Reload';
    var ok = 'Ok';
    if (game.data.ui) {
      ti = game.data.ui.error;
      re = game.data.ui.reload;
      ok = game.data.ui.ok;
    }
    box.append($('<h1>').text(ti));
    box.append($('<p>').html(details+'<br>'+re));
    box.append($('<div>').addClass('button alert').text(ok).on('mouseup touchend', function () {
      game.overlay.addClass('hidden');
      game.overlay.empty();
      if (cb) cb(true);
      return false;
    }));
  },
  logError: function(details) {
    if (!game.debug) {
      if (typeof(details) !== 'string') details = JSON.stringify(details);
      game.db({
        'set': 'errors',
        'data': details
      });
    }
  },
  reset: function(details) {
    game.logError(details);
    game.error(details, function(confirmed) {
      if (confirmed) {
        game.clear();
        game.setData('state', 'menu');
        location.reload(true);
      }
    });
  }
};
