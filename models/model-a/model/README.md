# model upload

Don't delete this ***model*** directory.

***model.tar.gz*** file in this directory will be uploaded by ***ModelArchvingStack***.

***model.tar.gz*** file can be created by ***pack_models.sh*** script in ***script*** directory.

The specific path can be set in ***app-config.json*** in ***config*** directory. ***model.tar.gz** in "ModelLocalPath" will be uploaed into ***ModelS3Key*** in S3.

```json
...
        "ModelArchiving": {
            "Name": "ModelArchivingStack",

            "BucketBaseName": "model-archiving",
            "ModelList": [
                {
                    "ModelLocalPath": "models/model-a/model",
                    "ModelS3Key":     "models/model-a/model"
                },
                {
                    "ModelLocalPath": "models/model-a/model",
                    "ModelS3Key":     "models/model-b/model"
                }
            ]
        },
...
```
