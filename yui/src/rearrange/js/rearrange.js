/**
 * Rearrange elements in the custom certificate
 *
 * @class Y.M.mod_customcert.rearrange
 * @constructor
 */
var Rearrange = function() {
    Rearrange.superclass.constructor.apply(this, [arguments]);
};
Y.extend(Rearrange, Y.Base, {

    /**
     * The template id.
     */
    templateid: 0,

    /**
     * The customcert page we are displaying.
     */
    page: [],

    /**
     * The custom certificate elements to display.
     */
    elements: [],

    /**
     * Store the location of the element before we move.
     */
    elementxy: 0,

    /**
     * The number of pixels in a mm.
     */
    pixelsinmm: 3.779527559055, // 3.779528.

    /**
     * Initialise.
     *
     * @param {Array} params
     */
    initializer: function(params) {
        // Set the course module id.
        this.templateid = params[0];
        // Set the page.
        this.page = params[1];
        // Set the elements.
        this.elements = params[2];

        this.setpositions();
        this.createevents();
        window.addEventListener("resize", this.checkWindownResize.bind(this));
    },

    /**
     * Sets the current position of the elements.
     */
    setpositions: function() {
        // Go through the elements and set their positions.
        for (var key in this.elements) {
            var element = this.elements[key];
            var posx = this.getPdfX() + element.posx * this.pixelsinmm;
            var posy = this.getPdfY() + element.posy * this.pixelsinmm;
            var nodewidth = parseFloat(Y.one('#element-' + element.id).getComputedStyle('width'));
            var maxwidth = element.width * this.pixelsinmm;

            if (maxwidth && (nodewidth > maxwidth)) {
                nodewidth = maxwidth;
            }

            switch (element.refpoint) {
                case '1': // Top-center.
                    posx -= nodewidth / 2;
                    break;
                case '2': // Top-right.
                    posx = posx - nodewidth + 2;
                    break;
            }

            Y.one('#element-' + element.id).setX(posx);
            Y.one('#element-' + element.id).setY(posy);
        }
    },

    getPdfX: function() {
        return Y.one('#pdf').getX();
    },

    getPdfY: function() {
        return Y.one('#pdf').getY();
    },

    getPdfWidth: function() {
        return parseFloat(Y.one('#pdf').getComputedStyle('width'));
    },

    getPdfHeight: function() {
        return parseFloat(Y.one('#pdf').getComputedStyle('height'));
    },

    getPdfLeftBoundary: function() {
        var pdfleftboundary = this.getPdfX();
        if (this.page.leftmargin) {
            pdfleftboundary += parseInt(this.page.leftmargin * this.pixelsinmm, 10);
        }

        return pdfleftboundary;
    },

    getPdfRightBoundary: function() {
        var pdfrightboundary = this.getPdfX() + this.getPdfWidth();
        if (this.page.rightmargin) {
            pdfrightboundary -= parseInt(this.page.rightmargin * this.pixelsinmm, 10);
        }

        return pdfrightboundary;
    },

    /**
     * Check browser resize and reset position.
     */
    checkWindownResize: function() {
        this.setpositions();
    },

    /**
     * Creates the JS events for changing element positions.
     */
    createevents: function() {
        // Trigger a save event when save button is pushed.
        Y.one('.savepositionsbtn [type=submit]').on('click', function(e) {
            this.savepositions(e);
        }, this);

        // Trigger a save event when apply button is pushed.
        Y.one('.applypositionsbtn [type=submit]').on('click', function(e) {
            this.savepositions(e);
            e.preventDefault();
        }, this);

        // Define the container and the elements that are draggable.
        var del = new Y.DD.Delegate({
            container: '#pdf',
            nodes: '.element'
        });

        // When we start dragging keep track of it's position as we may set it back.
        del.on('drag:start', function() {
            var node = del.get('currentNode');
            this.elementxy = node.getXY();
        }, this);

        // When we finish the dragging action check that the node is in bounds,
        // if not, set it back to where it was.
        del.on('drag:end', function() {
            var node = del.get('currentNode');
            if (this.isoutofbounds(node)) {
                node.setXY(this.elementxy);
            }
        }, this);
    },

    /**
     * Returns true if any part of the element is placed outside of the PDF div, false otherwise.
     *
     * @param {Node} node
     * @returns {boolean}
     */
    isoutofbounds: function(node) {
        // Get the width and height of the node.
        var nodewidth = parseFloat(node.getComputedStyle('width'));
        var nodeheight = parseFloat(node.getComputedStyle('height'));

        // Store the positions of each edge of the node.
        var left = node.getX();
        var right = left + nodewidth;
        var top = node.getY();
        var bottom = top + nodeheight;

        // Check if it is out of bounds horizontally.
        if ((left < this.getPdfLeftBoundary()) || (right > this.getPdfRightBoundary())) {
            return true;
        }

        // Check if it is out of bounds vertically.
        if ((top < this.getPdfY()) || (bottom > (this.getPdfY() + this.getPdfHeight()))) {
            return true;
        }

        return false;
    },

    /**
     * Perform an AJAX call and save the positions of the elements.
     *
     * @param {Event} e
     */
    savepositions: function(e) {
        // The parameters to send the AJAX call.
        var params = {
            tid: this.templateid,
            values: []
        };

        // Go through the elements and save their positions.
        for (var key in this.elements) {
            var element = this.elements[key];
            var node = Y.one('#element-' + element.id);

            // Get the current X and Y positions and refpoint for this element.
            var posx = node.getX() - this.getPdfX();
            var posy = node.getY() - this.getPdfY();
            var refpoint = node.getData('refpoint');

            var nodewidth = parseFloat(node.getComputedStyle('width'));

            switch (refpoint) {
                case '1': // Top-center.
                    posx += nodewidth / 2;
                    break;
                case '2': // Top-right.
                    posx += nodewidth;
                    break;
            }

            // Set the parameters to pass to the AJAX request.
            params.values.push({
                id: element.id,
                posx: Math.round(parseFloat(posx / this.pixelsinmm)),
                posy: Math.round(parseFloat(posy / this.pixelsinmm))
            });
        }

        params.values = JSON.stringify(params.values);

        // Save these positions.
        Y.io(M.cfg.wwwroot + '/mod/customcert/ajax.php', {
            method: 'POST',
            data: params,
            on: {
                failure: function(tid, response) {
                    this.ajaxfailure(response);
                },
                success: function() {
                    var formnode = e.currentTarget.ancestor('form', true);
                    var baseurl = formnode.getAttribute('action');
                    var pageinput = formnode.one('[name=pid]');
                    if (pageinput) {
                        var pageid = pageinput.get('value');
                        window.location = baseurl + '?pid=' + pageid;
                    } else {
                        var templateid = formnode.one('[name=tid]').get('value');
                        window.location = baseurl + '?tid=' + templateid;
                    }
                }
            },
            context: this
        });

        e.preventDefault();
    },

    /**
     * Handles any failures during an AJAX call.
     *
     * @param {XMLHttpRequest} response
     * @returns {M.core.exception}
     */
    ajaxfailure: function(response) {
        var e = {
            name: response.status + ' ' + response.statusText,
            message: response.responseText
        };
        return new M.core.exception(e);
    }
});

Y.namespace('M.mod_customcert.rearrange').init = function(templateid, page, elements) {
    new Rearrange(templateid, page, elements);
};
