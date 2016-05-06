var chai = require('chai'),
    expect = chai.expect,
    Crawl = require('../routes/crawl.js');

describe('Crawl',() => {
  it('elvantGetPage should return 1000 items', () => {
    Crawl.elvantGetPage({page:1}, (error, response, body) => {
      expect(error).is.null();
    });
    debugger;
    People.collection.insert(toSave, {}, (err, instances) => {
      if(err) {
        console.log(instances);
        res.send(err);
      } else {
        console.log(instances);
      }
    });
    debugger;
    People.update(toUpdate, {}, (err, instances) => {
      if(err) {
                                        console.lo
    })
  })
});
