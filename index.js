const axios = require('axios');
const fs = require('fs');
var path = require('path');
const workerpool = require('workerpool');
//Cores
const manganato = require('./cores/manganato');

findSupportedCore("https://readmanganato.com/manga-oe955387/chapter-1")
var pool = workerpool.pool('./imgdownloaders.js');

async function findSupportedCore(url) {
    if (manganato.supportsURL(url)) {
        manganato.grabinfo(url).then(mangaInfo =>{
            console.log("Chapter info done downloading");
            callWorkers(mangaInfo);

        });

    }

}

function callWorkers(mangaInfo){
    let loopArr = mangaInfo.splice(1);
    for (const chapter of loopArr){
        pool.exec('dlworker', [mangaInfo[0],chapter])
            .then(function (result) {
                //console.log(result);
                //console.log("Finished worker");

                //Will End
                if (pool.stats().pendingTasks < 1 && pool.stats().activeTasks < 1) {
                    pool.terminate();
                }

            })
            .catch(function (err) {
                console.log(err);
            });
    }

}


//Image downloader functions



