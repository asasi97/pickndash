from django.urls import path
from recommender import views


urlpatterns = [
    path('recommender/', views.recommender_list),

]
