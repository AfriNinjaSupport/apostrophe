apos.define('apostrophe-widget-editor', {
  extend: 'apostrophe-modal',
  source: 'modal',
  transition: 'slide',
  construct: function(self, options) {
    self.data = options.data || {};
    if (!self.data._id) {
      self.data._id = apos.utils.generateId();
    }
    self.saveContent = function(callback) {
      return async.series({
        convert: function(callback) {
          return apos.schemas.convert(self.$el, self.options.schema, self.data, function(err) {
            if (err) {
              return callback(err);
            }
            _.each(self.options.schema, function(field) {
              if ((field.type === 'area') || (field.type === 'singleton')) {
                if (!_.has(self.data, field.name)) {
                  // Even if these are contextual, we still need them to exist
                  self.data[field.name] = { type: 'area', items: [] };
                }
                // If we created the widget that contains an area, we can
                // also edit the area (just a hint to the UI, the server
                // handles enforcement for the whole doc)
                self.data[field.name]._edit = true;
              }
            });
            return callback(null);
          });
        },
        beforeSave: function(callback) {
          return self.beforeSave(callback);
        },
        save: function(callback) {
          return options.save(self.getData(), callback);
        }
      }, callback);
    };
    self.beforeSave = function(callback) {
      return setImmediate(callback);
    };
    self.beforeShow = function(callback) {
      return async.series({
        populate: function(callback) {
          return apos.schemas.populate(self.$el, self.options.schema, self.data, callback);
        }
      }, callback);
    };
    self.getData = function() {
      return self.data;
    };
  }
});