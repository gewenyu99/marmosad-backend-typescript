import "reflect-metadata"
import BoardService from "./service/boardService";
import {container} from "./config/inversify.config";
import {Http} from "./service/httpSingletonService";

export class App {
    private express = container.get<Http>(Http).express;
    private _port;
    private boardService: BoardService;

    constructor() {
        // Waits or server to boot.
        container.get<Http>(Http).httpStart().then(() => {
            console.log('server started successfully.');
            this.setupEndpoints();
            this.boardService = new BoardService();
        }).catch((err) => {
            console.log(err)
        });
    }

    get port(): number {
        return this._port;
    }

    private setupEndpoints() {
        const self = this;
        self.express.get('/boards', function (req, res) {
            res.send(self.boardService.getBoardsInfo());
        });

        self.express.post('/boards/generate', function (req, res) {
            const nonRepeating = self.boardService.newBoard(req.body.name, req.body.playerLimit);
            if (nonRepeating) {
                res.status(200).send({"message": "Successfully created " + req.body.name});
            } else {
                res.status(400).send({"message": "unable to create board" + req.body.name});
            }
        });

        self.express.post('/boards/remove', function (req, res) {
            const exist = self.boardService.removeBoard(req.body.socketUrl);
            if (exist) {
                res.status(200).send({"message": "Successfully removed " + req.body.socketUrl});
            } else {
                res.status(400).send({"message": "unable to delete board " + req.body.socketUrl});
            }
        });
    }
}


export default App;
