"use strict";

function Game() {
	this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
	this.camera.position.z = 7;

	this.actors = [];
	this.round = 1;
	this.roundTimer = 0;

	this.world = new World();
	this.hudScene = new THREE.Scene();

	var self = this;
	function resize() {
		var w = window.innerWidth - 200, h = window.innerHeight;
		self.camera.aspect = w / h;
		self.camera.updateProjectionMatrix();
		self.renderer.setSize(w, h);
		self.hudRenderer.setSize(w, h);
	}

	this.renderer = new THREE.WebGLRenderer({ antialias: true });
	document.getElementById("container").appendChild(this.renderer.domElement);

	this.hudRenderer = new THREE.CSS3DRenderer();
	this.hudRenderer.domElement.className = ".canvas";
	this.hudRenderer.domElement.getElementsByTagName("div")[0].className = ".canvas";
	document.getElementById("container").appendChild(this.hudRenderer.domElement);

	this.hudElems = [];
	for (var i = 0; i < 3; ++i) {
		var elem = document.createElement("div");
		elem.className = "hud-elem";
		var sprite = new THREE.CSS3DSprite(elem);
		var scale = 0.02;
		sprite.scale.set(scale, scale, scale);
		document.body.appendChild(elem);
		this.hudScene.add(sprite);
		this.hudElems.push(sprite);
	}

	window.addEventListener("resize", resize);
	resize();

	this.rendererInfo = document.getElementById("renderer-info");
	this.stats = new Stats();
	document.body.appendChild(this.stats.domElement);
}

Game.prototype.addActor = function(actor) {
	if (!this.actors.length) {
		this.camera.position.x = actor.position.x;
		this.camera.position.y = actor.position.y;
	}
	this.actors.push(actor);
	this.world.scene.add(actor);
};

Game.prototype.findActor = function(x, y) {
	for (var i = 0; i < this.actors.length; ++i) {
		var actor = this.actors[i];
		if (distSq(x, y, actor.position.x, actor.position.y) < 0.2 * 0.2)
			return actor;
	}
	return null;
};

Game.prototype.update = function() {
	if (Date.now() < this.roundTimer)
		return;
	var map = this.world.map;
	for (var i = 0; i < this.actors.length; ++i) {
		var actor = this.actors[i];
		if (actor.done) continue;

		var controller = actor.controller;
		if (!controller) continue;

		if (controller.poll()) {
			actor.done = true;
			var newx = Math.round(actor.position.x + controller.moveInput.x);
			var newy = Math.round(actor.position.y + controller.moveInput.y);
			var other = this.findActor(newx, newy);
			if (other && other.visible) {
				if (actor.faction != other.faction) {
					--other.health;
					if (other.health <= 0)
						other.visible = false;
					var notif = this.hudElems[0];
					notif.element.innerHTML = "Hit!";
					notif.position.copy(other.position);
					notif.position.z += 2;
				}
			} else if (map.isWalkable(newx, newy))
				actor.target = new THREE.Vector3(newx, newy, actor.position.z);
		}
		else return;
	}
	// If we got here, everybody has had their turn
	for (var i = 0; i < this.actors.length; ++i)
		this.actors[i].done = false;
	++this.round;
	this.roundTimer = Date.now() + 200;
}

Game.prototype.render = function(dt) {
	for (var i = 0; i < this.actors.length; ++i) {
		var actor = this.actors[i];
		if (actor.target === null) continue;
		lerp2d(actor.position, actor.target, dt * 15);
		if (actor.position.distanceToSquared(actor.target) < 0.001) {
			actor.position.copy(actor.target);
			actor.target = null;
		}
	}

	lerp2d(this.camera.position, this.actors[0].position, dt * 5);
	this.world.update(dt);
	this.renderer.render(this.world.scene, this.camera);
	this.hudRenderer.render(this.hudScene, this.camera);
	this.stats.update();

	var info = this.renderer.info;
	var report = [
		"Prog:", info.memory.programs,
		"Geom:", info.memory.geometries,
		"Tex:", info.memory.textures,
		"Calls:", info.render.calls,
		"Verts:", info.render.vertices,
		"Faces:", info.render.faces,
		"Pts:", info.render.points
	];
	this.rendererInfo.innerHTML = report.join(' ');
};
