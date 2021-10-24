//private
var JSSoup = require('jssoup').default;

//public
module.exports = supportsURl;
const supportsURl = url => new Promise((resolve, reject) => {
        if(url.contains("readmanganato.com") || url.contains("manganato.com")){
            resolve();
        }else{
            reject();
        }
    });

