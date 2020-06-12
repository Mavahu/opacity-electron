class FolderMetadataFileVersion {
  constructor(handle, size, modified, created) {
    this.handle = handle;
    this.size = size;
    this.modified = modified;
    this.created = created;
  }
}

class FolderMetadataFile {
  constructor(name, created, modified) {
    this.name = name;
    this.created = created;
    this.modified = modified;
    this.versions = [];
  }
}

class FolderMetadataFolder {
  constructor(name, handle) {
    this.name = name;
    this.handle = handle;
  }
}

class FolderMetadata {
  constructor(name, created, modified) {
    this.name = name;
    this.created = created;
    this.modified = modified;
    this.folders = [];
    this.files = [];
  }

  static toObject(data) {
    const folderMetadata = new FolderMetadata(
      data[0].toString(),
      parseInt(data[3]),
      parseInt(data[4])
    );

    for (const file of data[1]) {
      const folderMetadataFile = new FolderMetadataFile(
        file[0].toString(),
        parseInt(file[1]),
        parseInt(file[2])
      );

      for (const version of file[3]) {
        const folderMetadataFileVersion = new FolderMetadataFileVersion(
          version[0].toString(),
          parseInt(version[1]),
          parseInt(version[2]),
          parseInt(version[3])
        );
        folderMetadataFile.versions.push(folderMetadataFileVersion);
      }

      folderMetadata.files.push(folderMetadataFile);
    }

    for (const folder of data[2]) {
      const folderMetadataFolder = new FolderMetadataFolder(
        folder[0].toString(),
        folder[1].toString()
      );
      folderMetadata.folders.push(folderMetadataFolder);
    }

    return folderMetadata;
  }
}

module.exports = FolderMetadata;
