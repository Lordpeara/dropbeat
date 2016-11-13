'use strict';

define([
  'jquery', 'playlist', 'api', 'notification'
], function ($, Playlist, api, notify) {

/**
 * This controller manages what to be played next.
 */
function PlayOrderControl (playlistManager) {
  var RepeatStatus = {
    noRepeat: 0,
    repeatPlaylist: 1,
    repeatOne: 2
  };

  var ShuffleStatus = {
    noShuffle: 0,
    shuffle: 1
  }

  this.playQueue = [];

  this.repeatStatus = RepeatStatus.noRepeat;

  this.shuffleStatus = ShuffleStatus.noShuffle;

  this.repeatBtn = $('.controls .ctrl-repeat');

  this.shuffleBtn = $('.controls .ctrl-shuffle');

  this.init = function () {
    var that = this;
    this.repeatBtn.click(function () {
      that.onRepeatClicked();
    });

    this.shuffleBtn.click(function () {
      that.onShuffleClicked();
    });
  };

  this.onRepeatClicked = function () {
    this.repeatStatus = (this.repeatStatus + 1) % 3;

    switch (this.repeatStatus) {
      case RepeatStatus.noRepeat:
        this.repeatBtn.removeClass('repeat-one');
        break;
      case RepeatStatus.repeatPlaylist:
        this.repeatBtn.addClass('repeat');
        break;
      case RepeatStatus.repeatOne:
        this.repeatBtn.removeClass('repeat');
        this.repeatBtn.addClass('repeat-one');
        break;
    }
  };

  this.onShuffleClicked = function () {
    this.shuffleStatus = (this.shuffleStatus + 1) % 2;
    this.reloadQueue();

    switch (this.shuffleStatus) {
      case ShuffleStatus.noShuffle:
        this.shuffleBtn.removeClass('shuffle');
        break;
      case ShuffleStatus.shuffle:
        this.shuffleBtn.addClass('shuffle');
        break;
    }
  };

  this.reloadQueue = function () {
    var playlistTracks = playlistManager.currentPlaylist.tracks;
    if (this.shuffleStatus === ShuffleStatus.shuffle) {
      var i, j, temp;
      for (i = playlistTracks.length - 1; i > 0; i -= 1) {
        // Shuffle array.
        j = Math.floor(Math.random() * (i + 1));
        temp = playlistTracks[i];
        playlistTracks[i] = playlistTracks[j];
        playlistTracks[j] = temp;
      }
    }
    this.playQueue = playlistTracks;
  };

  this.getCurPosition = function (track) {
    for (var i = 0; i < this.playQueue.size(); i += 1) {
      if (this.playQueue[i].uid === track.uid) {
        return i;
      }
    }
  };

  this.popNext = function (curTrack) {
    if (repeatStatus === RepeatStatus.repeatOne) {
      // Should repeat current music regardless of shuffle status.
      return curTrack;
    } else {
      // Pick next.
      var pos = this.getCurPosition(curTrack);
      if (pos < this.playQueue.size() - 1) {
        // If there is remaining track, play it.
        return this.playQueue[pos + 1];
      } else {
        // No remaining track.
        if (repeatStatus === RepeatStatus.repeatPlaylist) {
          // Fill the queue again.
          this.reloadQueue();
        }
      }
    }
  };
};

/**
 * Playlist manager object.
 * It manages users' playlist (and tracks) addition/deletion/modifications.
 */

function PlaylistManager () {
  var that = this,
      // `reservedList` limit creating multiple playlists at once.
      reservedList = null,
      playlistCallback = null,

  loadPlaylist = function (uid) {
    $.get(api.Router.getPath('playlist'), {uid: uid})
      .done(function (resp) {
        if (resp.success) {
          var playlist = new Playlist(resp.playlist.uid,
                                      resp.playlist.name,
                                      resp.playlist.tracks);

          if (that.playlists.length === 0) {
            that.callbacks.onFirstPlaylistLoaded(playlist);
          }

          that.playlists.push(playlist);
        }
      });
  };

  this.loadAllPlaylists = function () {
    $.get(api.Router.getPath('playlistList'))
      .done(function (resp) {
        if (resp.success) {
          for (var i = 0; i < resp.list.length; i += 1) {
            loadPlaylist(resp.list[i]);
          }
        }
      });
  };

  this.currentPlaylist = null;

  this.playlists = [];

  this.callbacks = {
    onFirstPlaylistLoaded: null,
    onTrackAdded: null,
  };

  this.playOrderControl = new PlayOrderControl(this);
  this.playOrderControl.init();

  this.setPlaylistCallbacks = function (callbacks) {
    for (var key in callbacks) {
      if (callbacks.hasOwnProperty(key) && key in that.callbacks) {
        that.callbacks[key] = callbacks[key];

        if (key === 'onFirstPlaylistLoaded' && that.playlists.length > 0) {
          callbacks[key](that.playlists[0]);
        }
      }
    }
  };

  // Prepare a list, which is created by user but not submitted to server.
  // (clicked by `create new playlist`)
  // After create playlist by server, `this.commit` will be invoked.
  this.prepare = function () {
    var list = new Playlist();
    list.editing = true;

    reservedList = list;

    return list;
  };

  this.prepared = function () {
    return reservedList !== null;
  };

  this.commit = function (params) {
    if (params.cancel) {
      reservedList = null;
      return;
    }

    reservedList.uid = params.uid;
    reservedList.name = params.name;
    reservedList.editing = false;

    that.playlists.push(reservedList);
    reservedList = null;
  };

  this.getPlaylist = function (uid) {
    var uids = that.playlists.map(function (playlist) {
          return playlist.uid;
        }),
        idx = uids.indexOf(uid);

    return idx === -1 ? null : that.playlists[idx];
  };

  this.removePlaylist = function (uid) {
    var uids = that.playlists.map(function (playlist) {
          return playlist.uid;
        }),
        idx = uids.indexOf(uid);

    if (idx !== -1) {
      that.playlists.splice(idx, 1);
    }
  };

  this.addNewTrack = function (track) {
    var playlist = that.currentPlaylist,
        data = {
          uid: track.uid,
          name: track.name,
          playlist_uid: playlist.uid
        };

    $.ajax({
      url: api.Router.getPath('track'),
      type: 'POST',
      dataType: 'json',
      data: JSON.stringify(data),
      contentType: 'application/json; charset=utf-8',
    }).done(function (resp) {
      if (resp.success) {
        notify.onTrackAdded();
        playlist.push(resp.track);
        that.callbacks.onTrackAdded(resp.track);
      }
    });
  };
};


// NOTE Bacause of the same reason of using singleton in `playermanager.js`,
// it also should be used as singleton.
var getInstance = (function (instance) {
  function wrap () {
    if (instance === null) {
      instance = new PlaylistManager();
    }

    return instance;
  };

  return wrap;
})(null);

return getInstance;

});
