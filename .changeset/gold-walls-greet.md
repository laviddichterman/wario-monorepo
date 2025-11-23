---
"@wcp/wario-shared": major
---

switch to class based types and derive from those to maintain parity.
since class-validator and class-transformer use the Dto suffix, we've renamed the following types to avoid confusion between the base types and the Dto pattern
* all instances of FulfillmentDto should be renamed to FulfillmentData
* all instances of CustomerInfoDto should be renamed to CustomerInfoData
* all instances of FulfillmentDto should be renamed to FulfillmentData