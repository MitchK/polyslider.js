var svgns = "http://www.w3.org/2000/svg"

function PolySlider(canvas, options) {
	this.options = options || {};

	// Set option defaults
	this.options.onSelectionChanged = this.options.onSelectionChanged || function () {};
	this.options.radiusDelta = this.options.radiusDelta || 50;
	this.options.levelCount = this.options.levelCount || 3;
	this.options.optionCount = this.options.optionCount || 5;

	// Get center of canvas
	var width = canvas.getBoundingClientRect().width;
	var height = canvas.getBoundingClientRect().height;
	this.center = new Point("center", "static", width / 2, height / 2);

	// Create polygons
	var radius = 0;
	this.polygons = [];
	for (var i = 0; i < this.options.levelCount; i++) {
		radius += this.options.radiusDelta;
		var polygon = new Polygon(this.center, radius);
		for (var j = 0; j < this.options.optionCount; j++) {
			polygon.addPoint();
		}
		this.polygons.push(polygon);
	}

	// Create points groups
	this.pointsGroups = [];
	for (var i = 0; i < this.options.optionCount; i++) {
		var points = [];
		for (var j = 0; j < this.options.levelCount; j++) {
			points[j] = this.polygons[j].points[i];
		}
		var pointsGroup = new PointsGroup(points);
		this.pointsGroups.push(pointsGroup);
	}

	// Create selector polygon
	var self = this;
	this.selectorPolygon = new Polygon(this.center, radius, "dynamic");
	for (var option = 0; option < this.options.optionCount; option++) {
		var point = this.selectorPolygon.addPoint();
		this.pointsGroups[option].addSelectionListener({
			onSelectionChanged: (function (o) {
				return function (index) {
					return self.options.onSelectionChanged(o, index);
				}
			})(option)
		})
		point.attachToGroup(this.pointsGroups[option], 2);
	}

	// Draw
	this.polygons.forEach(function (polygon) {
		polygon.draw(canvas);
	})
	this.pointsGroups.forEach(function (pointsGroup) {
		pointsGroup.draw(canvas);
	})
	this.selectorPolygon.draw(canvas);
}

function Point(label, cssClass, x, y) {
	this.label = label || null;
	this.cssClass = cssClass || "static";
	this.x = x || 0;
	this.y = y || 0;
	this.dragging = false;
	this.positionListeners = [];
	this.pointsGroup = null;
	this.selection = null;
}

Point.prototype.addPositionListener = function(listener) {
	this.positionListeners.push(listener);
}

Point.prototype.notifyPositionChanged = function() {
	for (var i = 0; i < this.positionListeners.length; i++) {
		this.positionListeners[i].onPositionChanged(this);
	}
}

Point.prototype.attachToGroup = function (pointsGroup, index) {
	this.pointsGroup = pointsGroup;
	this.pointsGroup.snapToGroup(this, index);
}
Point.prototype.moveTo = function (coords) {
	this.x = coords.x;
	this.y = coords.y;
	if (this.circle) {
		this.circle.setAttributeNS(null, 'cx', this.x);
		this.circle.setAttributeNS(null, 'cy', this.y);
	}
	this.notifyPositionChanged(this);
}

Point.prototype.draw = function(parent) {
	this.circle = document.createElementNS(svgns, 'circle');
	this.circle.setAttributeNS(null, 'cx', this.x);
	this.circle.setAttributeNS(null, 'cy', this.y);

	var self = this
	switch (this.cssClass) {
	case "dynamic":
		this.circle.setAttributeNS(null, 'r', 20);
		this.circle.setAttributeNS(null, 'class', 'dynamic' );
		this.circle.setAttributeNS(null, 'style', 'cursor:move; fill: rgb(66, 244, 164);');
		this.circle.addEventListener('mousedown', startDrag);
		this.circle.addEventListener('mousemove', drag);
		this.circle.addEventListener('mouseup', endDrag);
		this.circle.addEventListener('mouseleave', endDrag);
		function startDrag(evt) {
			self.dragging = true;
		}
		function drag(evt) {
			if (self.dragging && self.pointsGroup) {
				self.moveTo(getMousePosition(self.circle, evt));
				self.pointsGroup.snapToGroup(self);
			}
		}
		function endDrag(evt) {
			self.dragging = false;
		}
		parent.appendChild(this.circle);
		return;
	case "static":
		this.circle.setAttributeNS(null, 'r', 10);
		this.circle.setAttributeNS(null, 'class', 'static' );
		this.circle.setAttributeNS(null, 'style', 'fill:rgb(200,200,200);');
		parent.appendChild(this.circle);
		return;
	}
}

function Line(point1, point2, cssClass) {
	this.point1 = point1;
	this.point1.addPositionListener(this);
	this.point2 = point2;
	this.point2.addPositionListener(this);
	this.cssClass = cssClass || "static";
	this.line = null;
}
Line.prototype.draw = function (parent) {
	this.line = document.createElementNS(svgns, 'line');
    this.line.setAttributeNS(null, 'x1', this.point1.x);
    this.line.setAttributeNS(null, 'y1', this.point1.y);
    this.line.setAttributeNS(null, 'x2', this.point2.x);
    this.line.setAttributeNS(null, 'y2', this.point2.y);

	switch (this.cssClass) {
	case "dynamic":
    	this.line.setAttributeNS(null, 'style', 'stroke:rgb(66, 244, 164);stroke-width:8');
		break;
	case "static":
    	this.line.setAttributeNS(null, 'style', 'stroke:rgb(200,200,200);stroke-width:0');
		break;
	case "pointsGroup":
    	this.line.setAttributeNS(null, 'style', 'stroke:rgb(200,200,200);stroke-width:8');
		break;
	}
  parent.appendChild(this.line);
}

Line.prototype.onPositionChanged = function (element) {
	if (element === this.point1) {
		this.line.setAttributeNS(null, 'x1', this.point1.x);
		this.line.setAttributeNS(null, 'y1', this.point1.y);
	} else if (element === this.point2) {
		this.line.setAttributeNS(null, 'x2', this.point2.x);
		this.line.setAttributeNS(null, 'y2', this.point2.y);
	}
}

function PointsGroup(points) {
	this.points = points || [];
	this.selectionListeners = [];
	this.selection = null;
	this.line = new Line(this.points[0], this.points[this.points.length - 1], "pointsGroup");
}

PointsGroup.prototype.addSelectionListener = function(listener) {
	this.selectionListeners.push(listener);
}

PointsGroup.prototype.notifySelectionChanged = function() {
	for (var i = 0; i < this.selectionListeners.length; i++) {
		this.selectionListeners[i].onSelectionChanged(this.selection);
	}
}


PointsGroup.prototype.snapToGroup = function (point, i) {
	if (typeof i != 'undefined') {
		if (this.selection === null || this.selection !== i) {
			this.selection = i;
			this.notifySelectionChanged(this.selection);
		}
		return point.moveTo(this.points[i]);
	} 

	// snap to line
	var startPoint = this.points[0];
	var endPoint = this.points[this.points.length - 1];
	if (startPoint === endPoint) {
		return point.moveTo(startPoint);
	}
	var coordsOnLine = closestPolyLinePoint(point.x, point.y, startPoint.x, startPoint.y, endPoint.x, endPoint.y);

	// check if we are close to a point
	for (var i = 0; i < this.points.length; i++) {
		var distance = Math.sqrt(Math.pow(coordsOnLine.x - this.points[i].x, 2) + Math.pow(coordsOnLine.y - this.points[i].y, 2));
		var threshold = 10;
		if (distance <= threshold) {		
			if (this.selection === null || this.selection !== i) {
				this.selection = i;
				this.notifySelectionChanged(this.selection);
			}
			return point.moveTo(this.points[i]);
		}
	}
	return point.moveTo(coordsOnLine);
};

PointsGroup.prototype.draw = function (parent) {
	this.line.draw(parent);
};

function Polygon(center, radius, cssClass) {
	this.points = [];
	this.lines = [];
	this.radius = radius;
	this.center = center || new Point(null, 200, 200);
	this.cssClass = cssClass || "static";
};
Polygon.prototype.addPoint = function (label) {
	var point = new Point(label, this.cssClass);
	this.points.push(point);
	return point;
};
Polygon.prototype.draw = function (parent) {

	if (this.points.length != 0) {
		var num = this.points.length;
		var angle = (2 * Math.PI)/(num);

		var offsetX = this.radius;
		var offsetY = this.radius;

		for (var i = 0; i < num; i++) {
			var drawAngle = angle * i - (0.5 * Math.PI);
			this.points[i].x = Math.cos(drawAngle) * this.radius + this.center.x
			this.points[i].y =  Math.sin(drawAngle) * this.radius + this.center.y
		}

		// Draw lines
		for (var i = 0; i < num; i++) {
			var line = new Line(this.points[i], this.points[(i + 1) % num], this.cssClass);
			line.draw(parent);
		}

		// Draw points
		for (var i = 0; i < num; i++) {
			this.points[i].draw(parent);
		}
	} else {
		console.log('No points to draw');
	}
};

function closestPolyLinePoint (px, py, x0, y0, x1, y1, etc, etc, etc){
	function dotLineLength(x, y, x0, y0, x1, y1, o){
			function lineLength(x, y, x0, y0){
					return Math.sqrt((x -= x0) * x + (y -= y0) * y);
			}
			if(o && !(o = function(x, y, x0, y0, x1, y1){
					if(!(x1 - x0)) return {x: x0, y: y};
					else if(!(y1 - y0)) return {x: x, y: y0};
					var left, tg = -1 / ((y1 - y0) / (x1 - x0));
					return {x: left = (x1 * (x * tg - y + y0) + x0 * (x * - tg + y - y1)) / (tg * (x1 - x0) + y0 - y1), y: tg * left - tg * x + y};
			}(x, y, x0, y0, x1, y1), o.x >= Math.min(x0, x1) && o.x <= Math.max(x0, x1) && o.y >= Math.min(y0, y1) && o.y <= Math.max(y0, y1))){
					var l1 = lineLength(x, y, x0, y0), l2 = lineLength(x, y, x1, y1);
					return l1 > l2 ? l2 : l1;
			}
			else {
					var a = y0 - y1, b = x1 - x0, c = x0 * y1 - y0 * x1;
					return Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);
			}
	};
	for(var args = [].slice.call(arguments, 0), lines = []; args.length > 4; lines[lines.length] = {y1: args.pop(), x1: args.pop(), y0: args.pop(), x0: args.pop()});
	if(!lines.length)
			return {x: px, y: py};
	for(var l, i = lines.length - 1, o = lines[i],
			lower = {i: i, l: dotLineLength(px,    py, o.x0, o.y0, o.x1, o.y1, 1)};
			i--; lower.l > (l = dotLineLength(px, py,
			(o = lines[i]).x0, o.y0, o.x1, o.y1, 1)) && (lower = {i: i, l: l}));
	py < Math.min((o = lines[lower.i]).y0, o.y1) ? py = Math.min(o.y0, o.y1)
			: py > Math.max(o.y0, o.y1) && (py = Math.max(o.y0, o.y1));
	px < Math.min(o.x0, o.x1) ? px = Math.min(o.x0, o.x1)
			: px > Math.max(o.x0, o.x1) && (px = Math.max(o.x0, o.x1));
	Math.abs(o.x0 - o.x1) < Math.abs(o.y0 - o.y1) ?
			px = (py * (o.x0 - o.x1) - o.x0 * o.y1 + o.y0 * o.x1) / (o.y0 - o.y1)
			: py = (px * (o.y0 - o.y1) - o.y0 * o.x1 + o.x0 * o.y1) / (o.x0 - o.x1);
	return {x: px, y: py};
};

function getMousePosition(svg, evt) {
  var CTM = svg.getScreenCTM();
  return {
    x: (evt.clientX - CTM.e) / CTM.a,
    y: (evt.clientY - CTM.f) / CTM.d
  };
};


