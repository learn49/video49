import { Vimeo } from "vimeo";

let mainVimeo: Vimeo = null;

export const setVimeoCredentials = (
  clientId: string,
  clientSecret: string,
  accessToken: string
) => {
  mainVimeo = new Vimeo(clientId, clientSecret);
  mainVimeo.setAccessToken(accessToken);
};

export const getVimeo = () => {
  if (!mainVimeo) {
    throw new Error("You need to setVimeoCredentials first.");
  }
  return mainVimeo;
};

export const getRequest = <T>(resource: string, opts = {}): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const vimeo = getVimeo();
    vimeo.request(
      {
        path: resource,
        method: "GET",
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

export const getVideo = async (videoId: string) =>
  getRequest(`/videos/${videoId}`);

export type VideosResponse = {
  paging: {
    next?: string;
  };
  data: any[];
};
export const getVideos = async (opts) =>
  getRequest<VideosResponse>(`/me/videos`, opts);

export async function* videosGenerator() {
  let done = false;
  let pageIndex = 1;
  while (!done) {
    const batch = await getVideos({
      query: {
        page: pageIndex,
        per_page: 2,
      },
    });

    done = true;
    if (!batch.paging.next) {
      done = true;
    }
    pageIndex++;
    yield batch;
  }
}
