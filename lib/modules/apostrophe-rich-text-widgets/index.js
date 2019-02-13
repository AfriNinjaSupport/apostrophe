// Implements rich text editor widgets. Unlike most widget types, the rich text
// editor does not use a modal; instead you edit in context on the page.

var _ = require('@sailshq/lodash');
var sanitizeHtml = require('sanitize-html');
var jsDiff = require('diff');

module.exports = {
  extend: 'apostrophe-widgets',

  label: 'Rich Text',

  contextual: true,

  defaultData: {
    content: ''
  },

  minimumDefaultOptions: {
    toolbar: [ 'styles', '|', 'bold', 'italic', 'strike', 'link', '|', 'bullet_list', 'ordered_list', '|', 'blockquote', 'code_block', '|', 'horizontal_rule', '|', 'undo', 'redo', 'align' ],
    styles: [
      // you may also use a `class` property with these
      {
        tag: 'p',
        label: 'Paragraph (P)'
      },
      {
        tag: 'h2',
        label: 'Heading 2 (H2)'
      },
      {
        tag: 'h3',
        label: 'Heading 3 (H3)'
      },
      {
        tag: 'h4',
        label: 'Heading 4 (H4)'
      }
    ]
  },

  // See minimumDefaultOptions for what always pass,
  // configure this option to override individual
  // properties of that, or configure minimumDefaultOptions
  // if you really want to shred the whole thing

  defaultOptions: {},

  browser: {
    components: {
      widgetEditor: 'ApostropheRichTextWidgetEditor',
      widget: 'ApostropheRichTextWidget'
    },
    tools: {
      'styles': {
        component: 'ApostropheTiptapStyles',
        label: 'Styles'
      },
      '|': {
        component: 'ApostropheTiptapDivider'
      },
      'bold': {
        component: 'ApostropheTiptapButton',
        label: 'Bold'
      },
      'italic': {
        component: 'ApostropheTiptapButton',
        label: 'Italic'
      },
      'horizontal_rule': {
        component: 'ApostropheTiptapButton',
        label: 'Horizontal Rule'
      },
      'link': {
        component: 'ApostropheTiptapLink',
        label: 'Link'
      },
      'bullet_list': {
        component: 'ApostropheTiptapButton',
        label: 'Bullets'
      },
      'ordered_list': {
        component: 'ApostropheTiptapButton',
        label: 'Ordered'
      },
      'strike': {
        component: 'ApostropheTiptapButton',
        label: 'Strike'
      },
      'blockquote': {
        component: 'ApostropheTiptapButton',
        label: 'Blockquote'
      },
      'code_block': {
        component: 'ApostropheTiptapButton',
        label: 'Code Block'
      },
      'undo': {
        component: 'ApostropheTiptapButton',
        label: 'Undo'
      },
      'redo': {
        component: 'ApostropheTiptapButton',
        label: 'Redo'
      },
      'align': {
        component: 'ApostropheTiptapButton',
        label: 'Align'
      }
    }
  },

  beforeConstruct: function(self, options) {
    options.defaultOptions = {
      ...options.minimumDefaultOptions,
      ...options.defaultOptions
    };
  },

  construct: function(self, options) {

    // Return just the rich text of the widget, which may be undefined or null if it has not yet been edited

    self.getRichText = function(widget) {
      return widget.content;
    };

    // TODO We may want to use the default widget load, if we start having nested
    // areas in rich text widgets to support lockups
    self.load = function(req, widgets, callback) {
      return setImmediate(callback);
    };

    var superSanitize = self.sanitize;
    self.sanitize = function(req, input, options, callback) {
      return superSanitize(req, input, options, function(err, output) {
        if (err) {
          return callback(err);
        }
        output.content = sanitizeHtml(input.content, self.optionsToSanitizeHtml(options));
        return callback(null, output);
      });
    };

    // Convert template-level options (including defaults for this widget
    // type) into a valid sanitize-html configuration, so that h4 can
    // be legal in one area and illegal in another

    self.optionsToSanitizeHtml = function(options) {
      return {
        ...sanitizeHtml.defaultOptions,
        allowedTags: self.toolbarToAllowedTags(options),
        allowedAttributes: self.toolbarToAllowedAttributes(options),
        allowedClasses: self.toolbarToAllowedClasses(options)
      };
    };

    self.toolbarToAllowedTags = function(options) {
      const allowedTags = {
        br: true,
        p: true
      };
      const simple = {
        'bold': [ 'b', 'strong' ],
        'italic': [ 'i', 'em' ],
        'strike': [ 's' ],
        'link': [ 'a' ],
        'horizontal_rule': [ 'hr' ],
        'bullet_list': [ 'ul', 'li' ],
        'ordered_list': [ 'ol', 'li' ],
        'blockquote': [ 'blockquote' ],
        'code_block': [ 'pre', 'code' ]
      };
      for (let item of options.toolbar || []) {
        if (simple[item]) {
          for (let tag of simple[item]) {
            allowedTags[tag] = true;
          }
        } else if (item === 'styles') {
          for (let style of (options.styles || [])) {
            const tag = style.tag;
            allowedTags[tag] = true;
          }
        }
      }
      return Object.keys(allowedTags);
    };

    self.toolbarToAllowedAttributes = function(options) {
      const allowedAttributes = {};
      const simple = {
        'link': {
          tag: 'a',
          attributes: [ 'href', 'id', 'name', 'target' ]
        }
      };
      for (let item of options.toolbar || []) {
        if (simple[item]) {
          for (let attribute of simple[item].attributes) {
            allowedAttributes[simple[item].tag] = allowedAttributes[simple[item].tag] || [];
            allowedAttributes[simple[item].tag].push(attribute);
          }
        }
      }
      return allowedAttributes;
    };

    self.toolbarToAllowedClasses = function(options) {
      const allowedClasses = {};
      if ((options.toolbar || []).includes('styles')) {
        for (let style of (options.styles || [])) {
          const tag = style.tag;
          const classes = self.getStyleClasses(style);
          allowedClasses[tag] = allowedClasses[tag] || {};
          for (let c of classes) {
            allowedClasses[tag][c] = true;
          }
        }
      }
      for (let tag of Object.keys(allowedClasses)) {
        allowedClasses[tag] = Object.keys(allowedClasses[tag]);
      }
      return allowedClasses;
    };

    self.getStyleClasses = function(heading) {
      if (!heading.class) {
        return [];
      }
      return heading.class.split(/\s+/);
    };

    // Rich text editor content is found in the
    // div itself as markup, so don't redundantly
    // represent it as a data attribute.
    self.filterForDataAttribute = function(widget) {
      return _.omit(widget, 'content');
    };

    self.addSearchTexts = function(item, texts) {
      texts.push({ weight: 10, text: self.apos.utils.htmlToPlaintext(item.content), silent: false });
    };

    self.compare = function(old, current) {
      var oldContent = old.content;
      if (oldContent === undefined) {
        oldContent = '';
      }
      var currentContent = current.content;
      if (currentContent === undefined) {
        currentContent = '';
      }
      var diff = jsDiff.diffSentences(self.apos.utils.htmlToPlaintext(oldContent).replace(/\s+/g, ' '), self.apos.utils.htmlToPlaintext(currentContent).replace(/\s+/g, ' '), { ignoreWhitespace: true });

      var changes = _.map(_.filter(diff, function(diffChange) {
        return diffChange.added || diffChange.removed;
      }), function(diffChange) {
        // Convert a jsDiff change object to an
        // apos versions change object
        if (diffChange.removed) {
          return {
            action: 'remove',
            text: diffChange.value,
            field: {
              type: 'string',
              label: 'Content'
            }
          };
        } else {
          return {
            action: 'add',
            text: diffChange.value,
            field: {
              type: 'string',
              label: 'Content'
            }
          };
        }
      });

      if (!changes.length) {
        // Well, something changed! Presumably the formatting.
        return [
          {
            action: 'change',
            field: {
              label: 'Formatting'
            }
          }
        ];
      }

      return changes;
    };

    self.isEmpty = function(widget) {
      var text = self.apos.utils.htmlToPlaintext(widget.content || '');
      return !text.trim().length;
    };

  }
};
