'use strict';

define([], function () {

function Router () {
  this.version = 'v1';

  this.paths = {
    user: 'user',
    signin: 'user/signin',
    signout: 'user/signout',
    playlist: 'playlist',
    playlistList: 'playlist/all',
    track: 'track',
    search: 'search',
    searchAsync: 'search/async'
  }

  this.getPath = function (path) {
    return '/api/' + this.version + '/' + this.paths[path];
  };
};

var errorCodes = {
  // Error codes from api response.
  duplicatedEmail: '100',
  invalidEmail: '101',
  passwordTooShort: '102',
  emailNotExist: '103',
  passwordMismatch: '104',
  duplicatedPlaylistName: '105',
  trackAlreadyExist: '106',
  playlistNotExist: '107',
  trackNotExist: '108',
  resultNotReady: '109'
};

var playerTypes = {
  youtube: '0',
  soundcloud: '1'
}

return {
  Router: new Router(),
  ErrorCodes: errorCodes,
  playerTypes: playerTypes
};

});
