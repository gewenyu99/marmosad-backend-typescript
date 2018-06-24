import * as jsonHandler from './jsonHandler'
import * as rxService '../dataServices/rxService'
var playerSubject = rxService.getPlayerSubject()
//rewrite as module in typescript
module.exports = {
    createPlayer: function (playerName, socket, socketid) {
        jsonHandler.createPlayer(function (hand) {
            playerSubject.next({
                data: {
                    "playerName": playerName,
                    "playerId": socketid,
                    "hand": hand,
                    "isJudge": false, // Do we still need this field? I think the currentJudge in display is good enough?
                    "score": 0
                },
                socket: socket
            });
        }, socketid);
    }
};