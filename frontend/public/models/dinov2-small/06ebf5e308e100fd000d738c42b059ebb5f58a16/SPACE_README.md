---
title: Plant Disease Scanner
emoji: 🌿
colorFrom: green
colorTo: yellow
sdk: static
pinned: true
license: cc-by-sa-4.0
short_description: Diagnose 26 plant diseases from a leaf photo, in-browser
tags:
- agriculture
- plant-disease
- computer-vision
- onnx
models:
- rodynaemad/plant-disease-dinov2-small
---

Upload a photo of a single leaf and get the most likely of 38 crop–condition classes (26 diseases,
12 healthy, 14 crops). The model ([plant-disease-dinov2-small](https://huggingface.co/rodynaemad/plant-disease-dinov2-small),
98.9% accuracy on unseen leaves) runs entirely in your browser with ONNX Runtime Web, so photos
never leave your device. Includes an "is this a leaf?" check. Built by Rodayna Emad Mohamed for
[BloomTech](https://github.com/itsRou/bloomtech-smart-agriculture). Screening aid only.
