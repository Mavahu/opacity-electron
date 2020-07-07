const Opacity = require('./opacity/OpacityAccount');

(async() => {
    let handle = "c18dee8900ef65150cc0f5cc931c4a241dc6e02dc60f0edac22fc16ff629d9676091fd781d82eccc747fc32e835c581d14990f2f9c3f271ec35fb5b35c6124ba"

    const opqAccount = new Opacity(handle);

    await opqAccount.createFolder("/bbabasdfadsö1")

    console.table(t);
})();