import * as Socket from 'socket.io';
import {inject, injectable} from "inversify";
import {Http} from "./httpSingletonService";
import {Chat} from "../Interface/socketInterface";
import {Subject} from "rxjs";
import {ConnectionEvent, rxEvents, RxEventsInterface} from "../Interface/rxEventInterface";

export interface SocketInterface {
    start(url, subject): void

    emitChat(room: string, usr: string, msg: string): void;

    url: string;
}

@injectable()
export class SocketService implements SocketInterface {
    private _io: Socket.Server = null;
    private _connections = new Map<string, Socket.Socket>();
    private _url: string;
    private boardSubject: Subject<RxEventsInterface>;

    constructor(@inject(Http) private http: Http) {
    }

    public start(url, subject:Subject<RxEventsInterface> = null): void {
        this._url = '/' + url;
        this._io = Socket(this.http.httpServer, {
            path: this._url, serveClient: false,
            // below are engine.IO options
            pingInterval: 1000,
            pingTimeout: 2000,
            cookie: false
        });
        console.log('[EVENT] socket started at ' + this.io.path());
        this.io.on('connection', (socket: Socket.Socket) => {
            this.handleNewConnection(socket)
        });

        if (subject != null){
            this.boardSubject = subject;
        }
    }

    public stop(): Promise<void> {
        return new Promise<void>(resolve => {
            for (let key in this._connections) {
                if (this._connections[key] && this._connections[key].disconnect) {
                    this._connections[key].disconnect()
                }
            }
        })
    }

    public emitChat(usr: string, msg: string): void {
        console.log('[EVENT] Emitted chat', {from: usr, msg: msg} as Chat);
        this.io.to('chat').emit('chat', {from: usr, msg: msg} as Chat);
    }

    private handleNewConnection(socket: Socket.Socket): void {
        const name = socket.handshake.query.name;
        console.log('[EVENT] Player: ' + name + ' joined.');
        this.setupSocket(socket, name);
        this.addConnection(name, socket);
    }

    private handleDisconnect(socket: Socket.Socket, name) {
        this._connections.delete(name);
    }

    private setupSocket(socket: Socket.Socket, name) {
        socket.join('chat');
        socket.join('game');
        socket.on('chat', (msg) => {
            console.log('chat found', msg);
            if (msg.trim()) {
                this.emitChat(name, msg);
            }
        });
        socket.on('kill', (reason) => {
            this.getConnection(name).disconnect(true);
        });
        socket.on('disconnecting', (reason) => {
            if(this.boardSubject != null){
                this.boardSubject.next({
                    event: rxEvents.playerDisconnect,
                    eventData: {
                        playerName: name,
                        socketUrl: this.io.path()
                    } as ConnectionEvent
                } as RxEventsInterface);
            }
            console.log('[EVENT] ' + name + ' disconneting due to ' + reason);
            this.handleDisconnect(socket, name)
        });
    }

    private addConnection(name: string, socket: Socket.Socket): void {
        this._connections.set(name, socket);
    }

    public getConnection(name: string): Socket.Socket {
        return this._connections.get(name)
    }

    get url(): string {
        return this._url;
    }

    get io() {
        return this._io
    }
}
