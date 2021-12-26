const workerpool = require('workerpool');
var fs = require('fs');
const fspromise = require('fs/promises');
const FileType = require("file-type");
var path = require('path')
const axios = require("axios");
const axiosRetry = require('axios-retry')

var debugprintlevel = 4 //0 Default|Debug
axiosRetry(axios, {
    retries: 3,
    shouldResetTimeout: true,
    retryCondition: (_error) => true // retry no matter what
});

/*
async function axiosget(url) {

    return axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1941.0 Safari/537.36',
            "Referer": "https://manganelo.com/",
        }
    }).then((response) => {
        if (response.status === 200) {
            return response;
        }
    }, (error) => console.log(error));
}

async function axiosgetStream(url) {


    return axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1941.0 Safari/537.36',
            "Referer": "https://manganelo.com/",
            "responseType": 'stream'
        }
    }).then((response) => {
        if (response.status === 200) {
            return response;
        }
    }, (error) => console.log(error));
}

*/
async function dlworker(mangaName, chapterInfo) {
    return new Promise(async function (resolve, reject) {
            let cleanMangaName = cleanString(mangaName.toLowerCase());
            let cleanChapterName = cleanString(chapterInfo[0].toLowerCase());
            createdir(cleanMangaName);
            let folderName = path.join(cleanMangaName, chapterInfo[1] + " " + cleanChapterName)
            createdir(folderName);
            let imgArray = chapterInfo.splice(2)

            let currentImg = 1;
            let promiseHolder = [];
            for (const imgURL of imgArray) {
                //Dls the image
                //let axiosImage = await axiosgetStream(imgURL);
                //Throws the data to a writer and gets a promise back
                filewriterPromise = filewriter(imgURL, folderName, currentImg);
                //Throw the promise into an arr for later processing
                promiseHolder.push(filewriterPromise);
                currentImg++;
            }
            debugprintlevel >= 2 ? console.log("About to wait for chapter to be done: " + cleanChapterName) : ""
            await Promise.all(promiseHolder);
            debugprintlevel >= 1 ? console.log("Starting download for: " + cleanChapterName) : ""
            resolve();

        }//End of function
    )//end of promise

}//end of dlworker

async function filewriter(url, folderName, filename) {
    debugprintlevel >= 3 ? console.log("Starting download for: " + url) : ""
    return new Promise((resolve, reject) => {
        axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1941.0 Safari/537.36',
                "Referer": "https://readmanganato.com/"
            }, responseType: 'stream'
        }).then((response) => {
            if (response.status === 200) {
                debugprintlevel >= 3 ? console.log("Download done for: " + url) : ""
                let filePath = path.join(__dirname, folderName, filename + ".jpg");
                if (url.includes(".png")) {
                    filePath = path.join(__dirname, folderName, filename + ".png");
                }

                const writer = fs.createWriteStream(filePath);

                debugprintlevel >= 4 ? console.log("About to pipe the data for: " + url) : ""
                response.data.pipe(writer);
                let error = null;
                writer.on('error', err => {
                    error = err;
                    writer.close();
                    reject(err);
                });
                debugprintlevel >= 4 ? console.log("Done piping the data for: " + url) : ""

                writer.on('close', async () => {
                    if (!error) {
                        debugprintlevel >= 3 ? console.log("Checking image file type for: " + filePath) : ""
                        //Need to double check if the file is a png or jpg, sometimes the given file extention is wrong and you cant view the image
                        const fileTypeResult = await FileType.fromFile(filePath);
                        if (fileTypeResult !== undefined) {
                            if (fileTypeResult.mime == "image/png" && !filePath.includes(".png")) {
                                fs.renameSync(filePath, filePath.slice(0, -4) + ".png");
                            }
                            if (fileTypeResult.mime == "image/jpeg" && !filePath.includes(".jpg")) {
                                fs.renameSync(filePath, filePath.slice(0, -4) + ".jpg");
                            }
                        }
                        debugprintlevel >= 3 ? console.log("Finished checking image file type for: " + filePath) : ""
                        resolve(true);
                    }
                    //no need to call the reject here, as it will have been called in the
                    //'error' stream;
                });
            }
        }, (error) => console.log(error));
    });
}

//
// promise.then(async () => {
//     const fileTypeResult = await FileType.fromFile(filePath);
//     resolve(true);
// }).catch((e) => {
//     console.log(e);
// })
//
// )
// }


//Windows file system does not like some characters so this will clean the strings for folder names
function cleanString(inputString) {
    let tmpString = "";
    let valid_chars = '-_.() abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    [...inputString].forEach(c => {
        if (valid_chars.includes(c)) {
            tmpString += c;
        }
    })
    return tmpString;
}

//Just the name, no cwd needed
function createdir(dirstr) {

    let fulldirstr = path.join(__dirname, dirstr);
    fs.access(fulldirstr, function (error) {
        if (error) {

            fs.mkdir(fulldirstr, function (error2) {
                if (error2) {
                    console.log(error2);
                }
            })
        }
    })
}

workerpool.worker({
    dlworker: dlworker
});