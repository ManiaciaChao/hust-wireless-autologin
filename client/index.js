#! /bin/node
const process = require('process');
const got = require('got');
const dgram = require('dgram');
const RSA = require('./rsa-loader');
const CONFIG = require('./config.json');

/**
 * @description Helper Functions
 */
const encrypt = password =>
    RSA.encryptedString(RSA.RSAKeyPair(...CONFIG.RSA_KEY), password);
const clear = () => process.stdout.write('\033c');
/**
 * @description Handle CampusNet Connection
 */
const CampusNet = {
    async connection() {
        try {
            return (await got('http://baidu.com')).body.includes('baidu');
        } catch (e) {
            return false;
        }
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
            password: encrypt(userInfo.password),
            queryString: queryString,
            operatorPwd: '',
            validcode: '',
            passwordEncrypt: 'true'
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
const loginHandler = async (msg, rinfo) => {
    const isOnline = await CampusNet.connection();
    if (isOnline) {
        return 'Already Online.';
    }
    const res = await CampusNet.login(JSON.parse(msg.toString()));
    return res;
};
/**
 * @description Initialize UDP Client
 */
const udpClient = dgram.createSocket('udp4');
udpClient.on('message', (msg, rinfo) => {
    loginHandler(msg, rinfo).then(data => console.log(data));
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
    const tryLogin = () => {
        if (isOnline) {
            return true;
        }
        const cmd = 'getAccount';
        udpClient.send(cmd, 0, cmd.length, CONFIG.UDP_PORT, CONFIG.UDP_ADDRESS);
        return false;
    };
    /**
     * @description login
     * Usage: node index.js -i
     */
    if (action === '-i') {
        if (tryLogin()) {
            console.log('Already Online.');
        }
        /**
         * @description logout
         * Usage: node index.js -o <optional:userIndex>
         */
    } else if (action === '-o') {
        if (!isOnline) {
            console.log('Already Offine.');
            return;
        }
        console.log(await CampusNet.logout(userIndex));
        /**
         * @description watch
         * Usage: node index.js -w
         */
    } else if (action === '-w') {
        setInterval(() => {
            clear();
            console.log('Detecting Connection...');
            if (tryLogin()) {
                console.log('Already Online.');
            } else {
                console.log('Reconnecting...');
            }
        }, CONFIG.CHECK_INTERVAL * 1000);
    }
})();
