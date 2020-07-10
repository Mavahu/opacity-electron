require = require("esm")(module/*, options*/)
const Opacity = require('./opacity/OpacityAccount');

(async() => {
    let handle = "c18dee8900ef65150cc0f5cc931c4a241dc6e02dc60f0edac22fc16ff629d9676091fd781d82eccc747fc32e835c581d14990f2f9c3f271ec35fb5b35c6124ba"

    const opqAccount = new Opacity(handle);

    const t = await opqAccount.getFolderMetadata("/")

    await opqAccount.upload("/", "C:\\Users\\Martin\\Downloads\\Silicon Valley S06E05d.mp4")
    //console.table(t);
})();