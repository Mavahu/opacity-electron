import Constants from "./Constants";

class FileMetaoptions {
  constructor() {
    this.blockSize = Constants.DEFAULT_BLOCK_SIZE;
    this.partSize = 10485760;
  }
}

class FileMetadata {
  static toObject(data) {
    const fmd = new FileMetadata();

    fmd.name = data.name;
    fmd.type = data.type;
    fmd.size = data.size;
    fmd.p = new FileMetaoptions();
    return fmd;
  }
}

export default FileMetadata
