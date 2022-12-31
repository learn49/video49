const dotenv = require("dotenv");

dotenv.config();

const axios = require("axios");
const fs = require("fs");
const { writeFile, mkdir } = require("fs/promises");

const Vimeo = require("vimeo").Vimeo;
const vimeo = new Vimeo(
  process.env.VIMEO_CLIENT_ID,
  process.env.VIMEO_CLIENT_SECRET
);
vimeo.setAccessToken(process.env.VIMEO_ACCESS_TOKEN);

const download = async (url, destination) => {
  const writer = fs.createWriteStream(destination);
  return axios({
    method: "get",
    url,
    responseType: "stream",
  }).then((response) => {
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on("error", (err) => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on("close", () => {
        if (!error) {
          resolve(true);
        }
      });
    });
  });
};

const getRequest = (resource, opts) =>
  new Promise((resolve, reject) => {
    vimeo.request(
      {
        path: resource,
        ...opts,
      },
      (err, body) => {
        if (err) {
          return reject(err);
        }
        resolve(body);
      }
    );
  });

const getVideo = async (videoId) => getRequest(`/videos/${videoId}`);
const getVideos = async (opts) => getRequest(`/me/videos`, opts);

async function* videosGenerator() {
  let done = false;
  let pageIndex = 1;
  while (!done) {
    const batch = await getVideos({
      query: {
        page: pageIndex,
        per_page: 2,
      },
    });
    //const { data, ...rest } = batch;
    //console.log(rest);
    done = true;
    if (!batch.paging.next) {
      done = true;
    }
    pageIndex++;
    yield batch;
  }
}

/*
vimeo.request(
  {
    path: "/me/videos",
    query: {
      page: 1,
      per_page: 10,
    },
  },
  (err, body, statusCode, headers) => {
    const { paging, data } = body;
    console.log({
      err,
      data,
    });
  }
);*/

/*
vimeo.request(
  {
    path: "/me/folders",
  },
  (err, body, statusCode, headers) => {
    const { data } = body;
    data.forEach((folder) => {
      console.log(
        folder.uri,
        "Folder: ",
        folder.name,
        "Videos:",
        folder.metadata.connections.videos.total,
        "Folders:",
        folder.metadata.connections.folders.total
      );
    });
  }
);
*/
/*
vimeo.request(
  {
    path: "/users/37931909/projects/14064975",
  },
  (err, body, statusCode, headers) => {
    const { data } = body;

    console.log(body.name, body.metadata.connections.videos);
  }
);
*/
/*
vimeo.request(
  {
    path: "/users/37931909/projects/14064975/videos",
  },
  (err, body, statusCode, headers) => {
    const { data } = body;

    console.log(body);
  }
);
*/

const run = async () => {
  /*
    const video = await getVideo("773080193");
  const { name, pictures } = video;
  console.log(name, pictures.sizes);
  */
  /*const videos = await getVideos({
    query: {
      page: 139,
      per_page: 100,
    },
  });
  console.log(videos);*/
  const videosGen = videosGenerator();
  let total = 0;
  const basePath = "files";
  for await (let videoBatch of videosGen) {
    total += videoBatch.data.length;
    console.log("Page: ", videoBatch.page);
    for await (let video of videoBatch.data) {
      // save video metadata
      const videoId = video.uri.split("/videos/")[1];
      const path = basePath + "/" + videoId + "/";
      try {
        await mkdir(path);
      } catch (err) {}
      await writeFile(path + "video.json", JSON.stringify(video));
      for await (let file of video.files) {
        const ext = file.quality === "hls" ? "m3u8" : "mp4";
        const filename = `${file.quality}-${file.rendition}`;
        await writeFile(path + filename + ".json", JSON.stringify(file));
        await download(file.link, path + filename + "." + ext);
      }
    }
  }
  console.log(total);
};

run();

// todo -> converter em promises cada uma das requisicoes
