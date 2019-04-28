#! /bin/node
const process = require('process');
const got = require('got');
const dgram = require('dgram');
const UDP_ADDRESS = 'SECRET_INFOMATION';
const UDP_PORT = 53;
/**
 * @description Handle CampusNet Connection
 */
const CampusNet = {
    async connection() {
        return (await got('http://baidu.com')).body.includes('baidu');
    },
    /**
     * @param {{username,password}} userInfo
     */
    async login(userInfo) {
        // Get so-called queryString
        const qsResult = await got('http://123.123.123.123');
        const queryString = qsResult.body.split('?')[1].split(`'`)[0];
        const form = {
            userId: userInfo.username,
            password: userInfo.password,
            queryString: queryString,
            operatorPwd: '',
            validcode: ''
        };
        const loginResult = await got.post(
            'http://192.168.50.3:8080/eportal/InterFace.do?method=login',
            { form: true, body: form }
        );
        const res = JSON.parse(loginResult.body);
        console.log(res);
        if (!res.userIndex) {
            return false;
        }
        return (await this.connection()) ? res : false;
    },
    /**
     * @param {string} userIndex
     * @description TODO: store userIndex
     */
    async logout(userIndex) {
        const form = { userIndex: userIndex };
        const res = await got(
            'http://192.168.50.3:8080/eportal/InterFace.do?method=logout',
            { form: true, body: form }
        );
        return res.body;
    }
};
/**
 * @description Callback for UDP Server's response
 */
const login = async (msg, rinfo) => {
    const isOnline = await CampusNet.connection();
    if (isOnline) {
        return 'Already Online.';
    }
    console.log(msg);
    const res = await CampusNet.login(JSON.parse(msg.toString()));
    return res;
};
/**
 * @description Initialize UDP Client
 */
const udpClient = dgram.createSocket('udp4');
udpClient.on('message', (msg, rinfo) => {
    login(msg, rinfo).then(data => console.log(data));
});
['close', 'error'].forEach(e =>
    udpClient.on(e, function() {
        console.log(`UDP CLIENT ${e.toUpperCase()}.`);
    })
);
/**
 * @description Entry Point
 */
(async () => {
    const [, , action, userIndex] = process.argv;
    const isOnline = await CampusNet.connection();
    if (action === '-i') {
        if (isOnline) {
            console.log('Already Online.');
            return;
        }
        const cmd = 'getAccount';
        udpClient.send(cmd, 0, cmd.length, UDP_PORT, UDP_ADDRESS);
    } else if (action === '-o') {
        if (!isOnline) {
            console.log('Already Offine.');
            return;
        }
        console.log(await CampusNet.logout(userIndex));
    }
})();
