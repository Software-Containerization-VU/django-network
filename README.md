## Create/update database schema:
After changes have been made to the models.py file run:

```sh
python manage.py makemigrations
python manage.py migrate
```

## Run application

```sh
python manage.py runserver
```

Verify the deployment by navigating to your server address in
your preferred browser.

```sh
127.0.0.1:8000
```