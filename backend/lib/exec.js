import { execFile } from "child_process";

export const run = (args) =>
  new Promise((resolve, reject) => {
    execFile(args[0], args.slice(1), (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
