from django.db import models

# Create your models here.


class Product(models.Model):
    name = models.CharField(max_length=70, blank=False, default='')
    price = models.IntegerField(default=0)

    def __str__(self):
        return 'Product - ' + self.name
