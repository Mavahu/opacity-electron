# Opacity Desktop Application

This desktop application allows you to interact with your previously created account from [Opacity](https://www.opacity.io/).
This application can help you to prevent some issues you may run into, when using the [Opacity](https://www.opacity.io/) website.
It supports all features and even offers you the possibility to rename folders or move files/folders around.

![](assets/readme-picture.png)

## Usage

### Prebuilt binaries

Pick from [here](https://github.com/Mavahu/opacity-electron/releases/tag/v1.0) the right version for your operating system and simply unpack it and you are ready to start the application.

### Installation

If you want to package the app by yourself, these steps are necessary.

```
# Clone this repository
$ git clone https://github.com/Mavahu/opacity-electron

# Go into the repository
$ cd opacity-electron

# Install the packages
$ npm i

# Package the application
$ npm run package
```

## Feature List

- [x] Basic browsing UI
- [x] File/Folder upload/download/deletion/renaming/moving
- [x] Folder creation
- [x] Sharelink creation
- [x] Handle saving/resetting
- [x] Files sorting
- [ ] Drag and drop files
- [ ] Upload/Download settings
- [ ] Implement account-handle check
- [ ] Account informations
- [ ] Batch requests
