---
"@jabworks/condux": patch
---

`blueprint`'s diagram checker no longer reports a labeled arrow as `unlabeled-edge` when its label sits centered at the arrow's tail. Label distance was measured from the label box's corners only, so an arrow leaving from under the middle of a wide note looked far from it; it now also measures from the arrow's endpoints to the box.
