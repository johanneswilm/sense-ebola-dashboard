'use strict';

describe('SED', function() {
  beforeEach(function() {
    // See e2e/home.js
    browser.ignoreSynchronization = true;
  });

  it('should redirect to the login page', function() {
    browser.get('/');
    var expected = browser.baseUrl + '/#/login?back=';
    expect(browser.getCurrentUrl()).toEqual(expected);
  });

  describe('login page', function() {
    var form;

    beforeEach(function() {
      browser.get('/#/login');
      form = element(by.tagName('form'));
    });

    it('should disable submit if username/password are missing', function() {
      var submitButton = form.element(by.tagName('button'));
      expect(submitButton.isEnabled()).toBe(false);
    });

    it('should only should help if user has typed', function() {
      var username = form.element(by.id('username'));
      var helpBlocks = username.all(by.css('.help-block'));
      expect(helpBlocks.count()).toBe(0);
      var input = username.element(by.tagName('input'));
      input.sendKeys('test');
      input.clear();
      expect(helpBlocks.count()).toBe(1);
    });
  });
});
