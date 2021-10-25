//private
const cheerio = require('cheerio');
var JSSoup = require('jssoup').default;
const axios = require('axios');

//public
//True or false, does the core support the url given
const supportsURL = function (url) {
    if (url.includes("readmanganato.com") || url.includes("manganato.com")) {
        return true;
    } else {
        return false;
    }
}

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

//Grabs the info and returns a standard data structure used to dl the images
// Data structure returned [["Manga name"],["chapter name","img url 1", "img url 2",...]...]
const grabinfo = async function (url) {
    return new Promise(async (resolve, reject) => {
        let axiosdata = await axiosget(url);

        let chapters = [];

        const soup = new JSSoup(axiosdata.data, false);
        var select = soup.find("select")

        //Finds the chapter numbers and checks them
        select.contents.forEach(function (elem, i) {

            try {
                if (elem.attrs["data-c"] >= 0) {
                    chapters.push(elem.attrs["data-c"]);
                }
            } catch (e) {
                console.log(e);
            }

        });
        getImageUrls(url, chapters).then(returnVar =>{
            resolve(returnVar);
        })

    })
}

async function getImageUrls(url, chapters) {
    return new Promise(async (resolve, reject) => {
        let modifiedURL = url.substring(0, url.indexOf("chapter")) + "chapter-";
        let returnvalue = [];
        let chaptersFinished = 0;
        let foundMangaName = false;
        chapters.forEach(async function (elem, i) {
            let subReturnDataStructure = [];
            let axiosdata = undefined;
            while(axiosdata == undefined){
                axiosdata = await axiosget(modifiedURL + elem);
            }

            const soup = new JSSoup(axiosdata.data, false);

            if (i == 0) { //Grab chapter name
                let divs = soup.findAll('div');
                divs.forEach(function (elem2, i) {
                    try {
                        if (elem2.attrs.class == "panel-breadcrumb" && !foundMangaName) {
                            let a = elem2.findAll("a");
                            let mangaTitle = a[1].attrs.title;
                            returnvalue.splice(0, 0, mangaTitle);
                            foundMangaName = true;
                        }
                    } catch (e) {
                        //console.log(e);
                    }
                });

            }
            let h1 = soup.find('h1');
            //Adds the chapter name and number to the sub return data structure
            subReturnDataStructure.push(h1.contents[0]._text);
            subReturnDataStructure.push(parseFloat(elem));

            //Finds and deals with the img tags per page
            let imgs = soup.findAll("img");
            imgs.forEach(function (elem3, i) {
                try {
                    //If the image is not one of the default site images
                    //Currently the easy way to do this, as the CDN urls change
                    if (elem3.attrs.src.indexOf("themes/hm/") == -1) {
                        subReturnDataStructure.push(elem3.attrs.src);
                    }
                } catch (e) {
                    //console.log(e)
                }
            }); //End of imgs for each

            returnvalue.push(subReturnDataStructure);
            chaptersFinished++;


        }); //end of chapter for each


        //Wait for the chapters to finish parsing
        while (chaptersFinished < chapters.length) {
            await sleep(1000);
        }

        //All chapters are done processing
        console.log("Done");
        returnvalue.sort(function (a, b) {
            if (typeof a == "string" || typeof b == "string") {
                //If it is a string then dont sort it, the only string should be the manga name
                return 0;
            } else {
                //Will sort the smaller chapter numbers first
                return a[1] - b[1]
            }
        });
        resolve(returnvalue);
        console.log(returnvalue);

    })

}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/*
const supportsURl = url => new Promise((resolve, reject) => {
        if(url.contains("readmanganato.com") || url.contains("manganato.com")){
            resolve();
        }else{
            reject();
        }
    });
 */

module.exports = {supportsURL, grabinfo};

