/*!
  * snack.js (c) Ryan Florence
  * https://github.com/rpflorence/snack
  * MIT License
  * Inspiration and code adapted from
  *  MooTools      (c) Valerio Proietti   MIT license
  *  jQuery        (c) John Resig         Dual license MIT or GPL Version 2
  *  contentLoaded (c) Diego Perini       MIT License
  *  Zepto.js      (c) Thomas Fuchs       MIT License
*/

if (typeof Object.create !== 'function'){
  Object.create = function (o){
    function F() {}
    F.prototype = o
    return new F
  }
}

!function(window){

  var snack = window.snack = {}
    , guid = 0
    , toString = Object.prototype.toString

  snack.extend = function (){
    if (arguments.length === 1)
      return snack.extend(snack, arguments[0])

    var target = arguments[0]

    for (var i = 1, l = arguments.length; i < l; i++)
      for (key in arguments[i])
        target[key] = arguments[i][key]

    return target
  }

  snack.extend({
    v: '%build%',

    bind: function (fn, context) {
      return function (){
        return fn.apply(context, arguments)
      }
    },

    id: function (){
      return ++guid
    },

    each: function (obj, fn, context){
      if (obj.length === undefined){ // loose check for object, we want array-like objects to be treated as arrays
        for (var key in obj) // no hasOwnProperty check, so watch the prototypes :P
          fn.call(context, obj[key], key, obj);
        return obj
      }

      for (var i = 0, l = obj.length; i < l; i++)
        fn.call(context, obj[i], i, obj)
      return obj
    },

    parseJSON: function(json) {
      if (typeof json !== 'string')
        return

      json = json.replace(/^\s+|\s+$/g, '')

      var isValid = /^[\],:{}\s]*$/.test(json.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
        .replace(/(?:^|:|,)(?:\s*\[)+/g, ""))

      if (!isValid)
        throw "Invalid JSON"
      
      var JSON = window.JSON // saves a couple bytes
      return JSON && JSON.parse ? JSON.parse(json) : (new Function("return " + json))()
    },

    isArray: function (obj){
      return toString.call(obj) === "[object Array]"
    },

    indexOf: [].indexOf ? function(item, array){
        return [].indexOf.call(array, item)
      } : function (item, array){
      for (var i = 0, l = array.length; i < l; i++)
        if (array[i] === item)
          return i

      return -1
    }
  })
}(window);
!function (snack, document){
  var proto = {}
    , query

  snack.wrap = function (nodes, context){
    // passed in a CSS selector
    if (typeof nodes === 'string')
      nodes = query(nodes, context)

    // passed in single node
    if (!nodes.length)
      nodes = [nodes]

    var wrapper = Object.create(proto)
      , i = 0
      , l = nodes.length

    for (; i < l; i++)
      wrapper[i] = nodes[i]

    wrapper.length = l
    wrapper.id = snack.id()
    return wrapper
  }

  snack.extend(snack.wrap, {
    define: function(name, fn){
      if (typeof name !== 'string'){
        for (i in name)
          snack.wrap.define(i, name[i])
        return
      }
      proto[name] = fn
    },

    defineEngine: function (fn){
      query = fn
    }
  })

  // QSA default selector engine, supports real browsers and IE8+
  snack.wrap.defineEngine(function (selector, context){
    if (typeof context === 'string')
      context = document.querySelector(context)

    return (context || document).querySelectorAll(selector)
  })
}(snack, document)
!function (snack, window, document){
  var add            = document.addEventListener ? 'addEventListener' : 'attachEvent'
    , remove         = document.addEventListener ? 'removeEventListener' : 'detachEvent'
    , prefix         = document.addEventListener ? '' : 'on'
    , ready          = false
    , top            = true
    , root           = document.documentElement
    , readyHandlers  = []

  snack.extend({
    stopPropagation: function (event){
      if (event.stopPropagation)
        event.stopPropagation()
      else
        event.cancelBubble = true
    },

    preventDefault: function (event){
      if (event.preventDefault)
        event.preventDefault()
      else
        event.returnValue = false
    }
  })

  snack.listener = function (params, handler){
    if (params.delegate){
      params.capture = true
      _handler = handler
      handler = function (event){
        var target = event.target || event.srcElement
          , nodes = typeof params.delegate === 'string'
            ? snack.wrap(params.delegate, params.node)
            : params.delegate(params.node)

        while (target && snack.indexOf(target, nodes) === -1 )
          target = target.parentNode

        if (target && !(target === this) && !(target === document))
          _handler.call(target, event, target)
      }
    }

    if (params.context)
      handler = snack.bind(handler, params.context)

    var methods = {
      attach: function (){
        params.node[add](
          prefix + params.event,
          handler,
          params.capture
        )
      },

      detach: function (){
        params.node[remove](
          prefix + params.event,
          handler,
          params.capture
        )
      },

      fire: function (){
        handler.apply(params.node, arguments)
      }
    }

    methods.attach()

    return methods
  }




  snack.ready = function (handler){
    if (ready){
      handler.apply(document)
      return
    }
    readyHandlers.push(handler)
  }

  // adapted from contentloaded
  function init(e) {
    if (e.type == 'readystatechange' && document.readyState != 'complete')
      return

    (e.type == 'load' ? window : document)[remove](prefix + e.type, init, false)

    if (!ready && (ready = true))
      snack.each(readyHandlers, function (handler){
        handler.apply(document)
      })
  }

  function poll() {
    try {
      root.doScroll('left')
    } catch(e) { 
      setTimeout(poll, 50)
      return
    }
    init('poll')
  }

  if (document.createEventObject && root.doScroll) {
    try {
      top = !window.frameElement
    } catch(e) {}
    if (top)
      poll();
  }

  document[add](prefix + 'DOMContentLoaded', init, false)
  document[add](prefix + 'readystatechange', init, false)
  window[add](prefix + 'load', init, false)
}(snack, window, document);
!function (snack){

  snack.publisher = function (obj){
    var channels = {}
    obj = obj || {}

    snack.extend(obj, {
      subscribe: function (channel, handler, context){
        var subscription = {
          fn: handler,
          ctxt: (context || {})
        }

        if (!channels[channel])
          channels[channel] = []

        var publik = {
          attach: function (){
            channels[channel].push(subscription)
          },
          detach: function (){
            channels[channel].splice(snack.indexOf(handler, channels[channel]), 1)
          }
        }
        publik.attach()
        return publik
      },

      publish: function (channel, argsArray){
        if (!channels[channel])
          return false

        snack.each(channels[channel], function (subscription){
          subscription.fn.apply(subscription.ctxt, argsArray || [])
        })

        return channels[channel].length
      }
    })

    return obj
  }

  snack.publisher(snack)

}(snack);
!function(snack, window, document){

snack.JSONP = function(params, callback){
  var jsonpString = 'jsonp' + snack.id()
    , script = document.createElement('script')
    , running = false

    snack.JSONP[jsonpString] = function(data){
      running = false
      delete snack.JSONP[jsonpString]
      callback(data)
    }

    if (typeof params.data === 'object')
      params.data = snack.toQueryString(params.data)

  var publik = {
    send: function (){
      running = true
      script.src = params.url + '?' + params.key + '=snack.JSONP.' + jsonpString + '&' + params.data
      document.getElementsByTagName('head')[0].appendChild(script)
    },

    cancel: function (){
      running && script.parentNode && script.parentNode.removeChild(script)
      running = false
      snack.JSONP[jsonpString] = function (){
        delete snack.JSONP[jsonpString]
      }
    }
  }

  if (params.now !== false)
    publik.send()

  return publik
}

snack.toQueryString = function(object, base){
  var queryString = []

  snack.each(object, function(value, key){
    if (base)
      key = base + '[' + key + ']'

    var result

    switch (snack.isArray(value)){
      case 'object':
        result = snack.toQueryString(value, key)
      break
      case 'array':
        var qs = {}
        snack.each(value, function(val, i){
          qs[i] = val
        })
        result = snack.toQueryString(qs, key)
      break
      default: result = key + '=' + encodeURIComponent(value)
    }

    if (value !== null)
      queryString.push(result)
  })

  return queryString.join('&')
}

var xhrObject = (function(){

  var XMLHTTP = function(){
    return new XMLHttpRequest();
  }

  var MSXML2 = function(){
    return new ActiveXObject('MSXML2.XMLHTTP');
  }

  var MSXML = function(){
    return new ActiveXObject('Microsoft.XMLHTTP');
  }

  try {
    XMLHTTP()
    return XMLHTTP
  } catch (e){
    try {
      MSXML2()
      return MSXML2
    } catch (e){
      MSXML()
      return MSXML
    }
  }
})();

function empty(){}

snack.request = function (options, callback){
  if (!(this instanceof snack.request))
    return new snack.request(options, callback)

  var self = this
  self.options = snack.extend({}, self.options, options)
  self.callback = callback
  self.xhr = new xhrObject
  self.headers = self.options.headers
  if (self.options.now !== false)
    self.send()
}

snack.request.prototype = {

  options: {/*
    user: '',
    password: '',*/
    exception: empty,
    url: '',
    data: '',
    method: 'get',
    now: true,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    },
    async: true,
    emulation: true,
    urlEncoded: true,
    encoding: 'utf-8'
  },

  onStateChange: function(){
    var self = this
      , xhr = self.xhr

    if (xhr.readyState != 4 || !self.running) return
    self.running = false
    self.status = 0

    try{
      var status = xhr.status
      self.status = (status == 1223) ? 204 : status
    } catch(e) {}

    xhr.onreadystatechange = empty;

    var args = self.status >= 200 && self.status < 300
      ? [false, self.xhr.responseText || '', self.xhr.responseXML]
      : [self.status]

    self.callback.apply(self, args)
  },
  
  setHeader: function(name, value){
    this.headers[name] = value;
    return this;
  },

  getHeader: function(name){
    try {
      return this.xhr.getResponseHeader(name)
    } catch(e) {
      return null
    }
  },
  
  send: function(){
    var self = this
      , options = self.options

    if (self.running) return self;

    self.running = true;

    var data = options.data || ''
      , url = String(options.url)
      , method = options.method.toLowerCase()

    if (typeof data !== 'string')
      data = snack.toQueryString(data)

    if (options.emulation && snack.indexOf(method, ['get', 'post']) < 0){
      var _method = '_method=' + method
      data = (data) ? _method + '&' + data : _method
      method = 'post'
    }

    if (options.urlEncoded && snack.indexOf(method, ['post', 'put']) > -1){
      var encoding = (options.encoding) ? '; charset=' + options.encoding : ''
      self.headers['Content-type'] = 'application/x-www-form-urlencoded' + encoding
    }

    if (!url)
      url = document.location.pathname

    var trimPosition = url.lastIndexOf('/')
    if (trimPosition > -1 && (trimPosition = url.indexOf('#')) > -1)
      url = url.substr(0, trimPosition)

    if (data && method == 'get'){
      url += (url.indexOf('?') > -1 ? '&' : '?') + data
      data = null
    }

    var xhr = self.xhr

    xhr.open(method.toUpperCase(), url, open.async, options.user, options.password)
    if (options.user && 'withCredentials' in xhr) xhr.withCredentials = true
    
    xhr.onreadystatechange = snack.bind(self.onStateChange, self)

    for (i in self.headers){
      try {
        xhr.setRequestHeader(i, self.headers[i])
      } catch (e){
        options.exception.apply(self, [i, self.headers[i]])
      }
    }

    xhr.send(data)
    if (!options.async) self.onStateChange()
    
    return self
  },

  cancel: function(){
    var self = this

    if (!self.running)
      return self

    self.running = false

    var xhr = self.xhr
    xhr.abort()

    xhr.onreadystatechange = empty

    self.xhr = new xhrObject()
    return self
  }
}

}(snack, window, document)
!function(snack, document){
  snack.wrap.define({
    data: function (){
      var storage = {}

      return function (key, value){
        var data = storage[this.id]

        if (!data)
          data = storage[this.id] = {}

        if (value === undefined)
          return data[key]

        return data[key] = value
      }  
    }(),

    each: function (fn, context){
      return snack.each(this, fn, context)
    },
  
    addClass: function (className){
      return this.each(function (element){
        if (clean(element.className).indexOf(className) > -1)
          return
        element.className = clean(element.className + ' ' + className)
      })
    },

    removeClass: function (className){
      return this.each(function (element){
        element.className = element.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1')
      })
    },

    attach: function (event, handler, /* internal */ delegation){
      var split = event.split('.')
        , listeners = []

      if (split[1])
        listeners = this.data(split[1]) || []

      this.each(function(node){
        var params = {
          node: node,
          event: split[0]
        }

        if (delegation)
          params.delegate = delegation

        listeners.push(snack.listener(params, handler))
      })

      if (split[1])
        this.data(split[1], listeners)

      return this
    },

    detach: function (namespace){
      listenerMethod(this, 'detach', namespace, null, true)
      this.data(namespace, null)
      return this
    },

    fire: function (namespace, arguments){
      return listenerMethod(this, 'fire', namespace, arguments)
    },

    delegate: function (event, delegation, handler){
      return this.attach(event, handler, delegation)
    }
  })

  function clean(str){
    return str.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '')
  }

  function listenerMethod(wrapper, method, namespace, arguments){
    var data = wrapper.data(namespace)

    if (data)
      snack.each(data, function (listener){
        listener[method].apply(wrapper, arguments)
      })

    return wrapper
  }
}(snack, document);
/*!
  * qwery.js - copyright @dedfat
  * https://github.com/ded/qwery
  * Follow our software http://twitter.com/dedfat
  * MIT License
  */
!function (context, doc) {

  var c, i, j, k, l, m, o, p, r, v,
      el, node, len, found, classes, item, items, token, collection,
      id = /#([\w\-]+)/,
      clas = /\.[\w\-]+/g,
      idOnly = /^#([\w\-]+$)/,
      classOnly = /^\.([\w\-]+)$/,
      tagOnly = /^([\w\-]+)$/,
      tagAndOrClass = /^([\w]+)?\.([\w\-])+$/,
      html = doc.getElementsByTagName('html')[0],
      tokenizr = /\s(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\])/,
      simple = /^([a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/,
      attr = /\[([\w\-]+)(?:([\^\$\*]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/,
      chunker = new RegExp(simple.source + '(' + attr.source + ')?');

  function array(ar) {
    r = [];
    for (i = 0, len = ar.length; i < len; i++) {
      r[i] = ar[i];
    }
    return r;
  }


  var cache = function () {
    this.c = {};
  };
  cache.prototype = {
    g: function (k) {
      return this.c[k] || undefined;
    },
    s: function (k, v) {
      this.c[k] = v;
      return v;
    }
  };

  var classCache = new cache(),
      cleanCache = new cache(),
      attrCache = new cache(),
      tokenCache = new cache();

  function q(query) {
    return query.match(chunker);
  }

  function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value) {
    var m, c, k;
    if (tag && this.tagName.toLowerCase() !== tag) {
      return false;
    }
    if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) {
      return false;
    }
    if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
      for (i = classes.length; i--;) {
        c = classes[i].slice(1);
        if (!(classCache.g(c) || classCache.s(c, new RegExp('(^|\\s+)' + c + '(\\s+|$)'))).test(this.className)) {
          return false;
        }
      }
    }
    if (wholeAttribute && !value) {
      o = this.attributes;
      for (k in o) {
        if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
          return this;
        }
      }
    }
    if (wholeAttribute && !checkAttr(qualifier, this.getAttribute(attribute) || '', value)) {
      return false;
    }
    return this;
  }

  function loopAll(token) {
    var r = [], intr = q(token), tag = intr[1] || '*',
        els = doc.getElementsByTagName(tag), i, l;
    for (i = 0, l = els.length; i < l; i++) {
      el = els[i];
      if (item = interpret.apply(el, intr)) {
        r.push(item);
      }
    }
    return r;
  }

  function clean(s) {
    return cleanCache.g(s) || cleanCache.s(s, s.replace(/([\.\*\+\?\^\$\{\}\(\)\|\[\]\/\\])/g, '\\$1'));
  }

  function checkAttr(qualify, actual, val) {
    switch (qualify) {
    case '=':
      return actual == val;
    case '^=':
      return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, new RegExp('^' + clean(val))));
    case '$=':
      return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, new RegExp('$' + clean(val))));
    case '*=':
      return actual.match(attrCache.g(val) || attrCache.s(val, new RegExp(clean(val))));
    }
    return false;
  }

  function _qwery(selector) {
    var r = [], ret = [], i,
        tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr));
    tokens = tokens.slice(0);
    if (!tokens.length) {
      return r;
    }
    r = loopAll(tokens.pop());
    if (!tokens.length) {
      return r;
    }
    // loop through all descendent tokens
    for (j = r.length; j--;) {
      node = r[j];
      p = node;
      // loop through each token
      for (i = tokens.length; i--;) {
        parents:
        while (p !== html && (p = p.parentNode)) { // loop through parent nodes
          if (found = interpret.apply(p, q(tokens[i]))) {
            break parents;
          }
        }
      }
      found && ret.push(node);
    }
    return ret;
  }

  var isAncestor = 'compareDocumentPosition' in html ?
    function (element, container) {
      return (container.compareDocumentPosition(element) & 16) == 16;
    } : 'contains' in html ?
    function (element, container) {
      return container !== element && container.contains(element);
    } :
    function (element, container) {
      while ((element = element.parentNode)) {
        if (element === container) {
          return true;
        }
      }
      return false;
    };

  var qwery = function () {
    function qsa(selector, root) {
      root = (typeof root == 'string') ? qsa(root)[0] : root;
      if (m = selector.match(idOnly)) {
        return [doc.getElementById(m[1])];
      }
      if (doc.getElementsByClassName && (m = selector.match(classOnly))) {
        return array((root || doc).getElementsByClassName(m[1]), 0);
      }
      return array((root || doc).querySelectorAll(selector), 0);
    }

    // return fast
    if (doc.querySelector && doc.querySelectorAll) {
      return qsa;
    }

    return function (selector, root, f) {
      root = (typeof root == 'string') ? qwery(root)[0] : (root || doc);
      var i, result = [], collections = [], element;
      if (m = selector.match(idOnly)) {
        return [doc.getElementById(m[1])];
      }
      if (m = selector.match(tagOnly)) {
        return root.getElementsByTagName(m[1]);
      }
      if (m = selector.match(tagAndOrClass)) {
        items = root.getElementsByTagName(m[1] || '*');
        r = classCache.g(m[2]) || classCache.s(m[2], new RegExp('(^|\\s+)' + m[2] + '(\\s+|$)'));
        for (i = items.length; i--;) {
          r.test(items[i].className) && result.push(items[i]);
        }
        return result;
      }
      // here we allow combinator selectors: $('div,span');
      for (items = selector.split(','), i = items.length; item = items[--i];) {
        collections[i] = _qwery(item);
      }

      for (i = collections.length; collection = collections[--i];) {
        var ret = collection;
        if (root !== doc) {
          ret = [];
          for (j = collection.length; element = collection[--j];) {
            // make sure element is a descendent of root
            isAncestor(element, root) && ret.push(element);
          }
        }
        result = result.concat(ret);
      }
      return result;
    };
  }();

  // being nice
  var oldQwery = context.qwery;
  qwery.noConflict = function () {
    context.qwery = oldQwery;
    return this;
  };
  context.qwery = qwery;

}(this, document);
snack.qwery = qwery.noConflict()
snack.wrap.defineEngine(function (selector, context){
  return snack.qwery(selector, context);
})