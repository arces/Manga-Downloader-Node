const axios = require('axios');
const fs = require('fs');
var path = require('path');
const workerpool = require('workerpool');
//Cores
const manganato = require('./cores/manganato');

findSupportedCore("https://readmanganato.com/manga-va953509/chapter-0")
var pool = workerpool.pool('./imgdownloaders.js', {maxWorkers:10,workerType:"process"});

const timeoutms = 30000
var debugprintlevel = 4 //0 Default|Debug
var isPoolTermanated = false;

function findSupportedCore(url) {
    console.time("Supported Cores")
    if (manganato.supportsURL(url)) {
        manganato.grabinfo(url).then(mangaInfo =>{
            console.log("Chapter info done downloading");
            console.timeEnd("Supported Cores");
            callWorkers(mangaInfo);
            console.log("Done downloading manga");
        });

    }

}

async function callWorkers(mangaInfo){
    console.time("Img Downloader");
    let loopArr = mangaInfo.splice(1);
    for (const chapter of loopArr){
        pool.exec('dlworker', [mangaInfo[0],chapter])
            .timeout(timeoutms)
            .then(function (result) {
                //console.log(result);
                //console.log("Finished worker");

                //Will End
                safeToTerminatePool();
                console.timeEnd("Img Downloader");

            })
            .catch(function (err) {
                console.log(err);
                safeToTerminatePool();
            });
    }

    while(pool.stats().pendingTasks > 0 || pool.stats().activeTasks > 0){
        debugprintlevel >= 3 ? console.log("Total:"+pool.stats().totalWorkers) : ""
        debugprintlevel >= 3 ? console.log("Busy:"+pool.stats().busyWorkers) : ""
        debugprintlevel >= 3 ? console.log("Idle:"+pool.stats().idleWorkers) : ""
        debugprintlevel >= 3 ? console.log("Pending:"+pool.stats().pendingTasks) : ""
        debugprintlevel >= 3 ? console.log("Active:"+pool.stats().activeTasks) : ""
        await sleep(10000);
    }



}

function safeToTerminatePool(){
    if (pool.stats().pendingTasks < 1 && pool.stats().activeTasks < 1) {
        pool.terminate();
        isPoolTermanated = true;
        console.timeEnd("Img Downloader");
    }
}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

//Image downloader functions



