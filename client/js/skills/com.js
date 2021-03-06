game.skills.com = {
  aoe: {
    cast: function (skill, source, target) {
      var opponent = source.opponent();
      var totalDamage = skill.data('damage');
      var range = skill.data('aoe range');
      if (source.data('skill range bonus')) range += source.data('skill range bonus');
      target.inRange(range, function (spot) {
        var card = spot.find('.card');
        if (card.hasClass(opponent)) {
          if (card.hasClass('units')) totalDamage += skill.data('damage per unit');
          if (card.hasClass('heroes')) totalDamage += skill.data('damage per hero');
        }
      });
      target.inRange(range, function (spot) {
        var card = spot.find('.card');
        if (card.hasClass(opponent)) {
          source.damage(totalDamage, card, skill.data('damage type'));
        }
      });
    }
  },
  heal: {
    cast: function (skill, source, target) {
      target.purge();
      var buff = source.addBuff(target, skill);
      target.heal(buff.data('heal'));
      buff.on('buffcount', this.buffcount);
      target.select();
    },
    buffcount: function (event, eventdata) {
      var target = eventdata.target;
      var buff = eventdata.buff;
      if (buff.data('duration') !== 3) target.heal(buff.data('heal'));
    }
  },
  counter: {
    passive: function (skill, source) {
      var side = source.side();
      game[side].cardsPerTurn += 1;
      source.on('attacked.com-counter', this.attacked);
      source.selfBuff(skill);
    },
    attacked: function (event, eventdata) {
      var source = eventdata.source;
      var legion = eventdata.target;
      var damage = eventdata.damage;
      var buff = legion.getBuff('com-counter');
      var lifesteal = buff.data('lifesteal') / 100;
      var chance = buff.data('chance') / 100;
      if ( legion.inAttackRange(source) && game.random() < chance && legion.side() == source.opponent() ) {
        game.audio.play('com/counter');
        legion.attack(source, 'force');
        legion.heal(damage * lifesteal);
      }
    }
  },
  ult: {
    cast: function (skill, source, target) {
      source.addClass('nohighlight');
      game.lockSelection = true;
      source.on('death.com-ult', this.death);
      target.on('death.com-ult', this.death);
      for (var i=0; i < skill.data('attacks'); i++) {
        game.timeout(1400 * i, source.attack.bind(source, target, 'force'));
        game.timeout((1400 * i) + 700, target.attack.bind(target, source, 'force'));
      }
      game.timeout(4200, function (source, target) {
        game.lockSelection = false;
        source.removeClass('nohighlight').off('death.com-ult').reselect();
        target.off('death.com-ult');
      }.bind(this, source, target));
    },
    death: function (event, eventdata) {
      var source = eventdata.source;
      var target = eventdata.target;
      game.audio.play('com/ultvictory');
      source.setDamage(source.data('current damage') + 2);
    }
  }
};
