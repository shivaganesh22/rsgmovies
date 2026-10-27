import os
from django.http import JsonResponse
import requests
from urllib.parse import urlparse, urlunparse
from bs4 import BeautifulSoup as bs

# Domain configuration
domain = os.getenv("ALL_MOVIES_DOMAIN", "https://123multihub.one/")
def allMovies(r):
    req=requests.get(domain+"multimovies/")
    soup=bs(req.content,'html.parser')
    movies=[]
    try:
      items=soup.find_all('article')
      for  i in items:
        link=urlparse(i.find('a')['href']).path
        image=i.find('img')['src']
        x=i.find('div',class_='data')
        name=x.find('h3').get_text()
        year=x.find('span').get_text()
        movies.append({"link":link,"image":image,"name":name,"year":year})
    except:
      pass

    #genres
    genres=[]
    try:
      items=soup.find('nav',class_='genres').find_all('li')
      for i in items:
        x=i.find('a')
        name=x.get_text()
        link=urlparse(x['href']).path
        count=i.find('i').get_text()
        genres.append({"name":name,"link":link,"count":count})
    except:
      pass
    #years
    years=[]
    try:
      items=soup.find('nav',class_='releases').find_all('li')
      for i in items:
        x=i.find('a')
        name=x.get_text()
        link=urlparse(x['href']).path
        years.append({"name":name,"link":link})
    except:
      pass
    #navbar
    navbar=[]
    try:
      items=soup.find('ul',class_='main-header')
      for i in items.find_all('li',recursive=False):
        name=i.a.get_text()
        linki=str(urlparse(i.a.get('href')).path)
        if name.lower() == "home" or linki=="b''":
          linki=""
        subitems=[]
        try:
          sub_ul = i.find('ul')
          if sub_ul:
            for j in sub_ul.find_all('li'):
              link=urlparse(j.a.get('href')).path
              namej=j.a.get_text()
              subitems.append({"link":link,"name":namej})
        except:
          pass
        navbar.append({"link":linki,"name":name,"subitems":subitems})
    except:
      pass
    data={"movies":movies,"genres":genres,"years":years,"navbar":navbar}
    return JsonResponse(data)
def imdbMovies(r):
    req=requests.get(domain+"imdb/")
    soup=bs(req.content,'html.parser')
    movies=[]
    try:
      items=soup.find('div',class_='top-imdb-list tleft').find_all('div',class_='top-imdb-item')
      for i in items:
        link=urlparse(i.find('a')['href']).path
        image=i.find('img')['src']
        name=i.find('div',class_='title').get_text()
        rating=i.find('div',class_='rating').get_text()
        movies.append({"link":link,"image":image,"name":name,"rating":rating})
    except:
      pass
    data={"movies":movies}
    return JsonResponse(data)
#search
def allMoviesSearch(r):
    req=requests.get(domain+"?s="+r.GET['query'])
    soup=bs(req.content,'html.parser')

    movies=[]
    #movies
    try:
      items=soup.find_all('article')
      for  i in items:
        link=urlparse(i.find('a')['href']).path
        image=i.find('img')['src']
        name=i.find('div',class_='title').get_text()
        year=i.find('div',class_='meta').find_all('span')
        year=' '.join([i.get_text() for i in year])
        movies.append({"link":link,"image":image,"name":name,"year":year})
    except:
      pass
    #pagination
    # pagination={}
    # try:
    #   items=soup.find('div',class_='pagination')
    #   arrows=[]
    #   for i in items.find_all('a',class_="arrow_pag"):
    #     arrows.append(urlparse(i['href']).path)
    #   pages=[]
    #   for i in items.find_all('a',class_="inactive"):
    #     link=urlparse(i['href']).path
    #     name=i.get_text()
    #     pages.append({"link":link,"name":name})
    #   pagination["current"]=items.find('span',class_='current').get_text()
    #   pagination["count"]=items.find('span').get_text()
    #   pagination["pages"]=pages
    #   pagination["arrows"]=arrows
    # except:
    #   pass
    
    data={"movies":movies}
    return JsonResponse(data)
def allMoviesLink(r):
    req=requests.get(domain+r.GET['link'])
    soup=bs(req.content,'html.parser')
    title=""
    try:
      title=soup.find('h1',class_='heading-archive').get_text()
    except:
      pass
    #quick links
    links=[]
    try:
      items=soup.find('div',class_='desc_category').find('p',style='text-align: center').find_all('a')
      for i in items:
        name=i.get_text()
        link=urlparse(i['href']).path
        links.append({"name":name,"link":link})
    except:
      pass
    #trendings
    trendings=[]
    try:
      items=soup.find('span',class_='s_trending').find_all('a')
      for i in items:
        name=i.get_text()
        parsed_url = urlparse(i["href"])
        link = urlunparse(('', '', parsed_url.path, '', parsed_url.query, ''))
        trendings.append({"name":name,"link":link})
    except:
      pass
    #movies
    movies=[]
    try:
      items=soup.find_all('article')
      for  i in items:
        link=urlparse(i.find('a')['href']).path
        image=i.find('img')['src']
        x=i.find('div',class_='data')
        name=x.find('h3').get_text()
        year=x.find('span').get_text()
        movies.append({"link":link,"image":image,"name":name,"year":year})
    except:
      pass
    #pagination
    pagination={}
    try:
      items=soup.find('div',class_='pagination')
      arrows=[]
      for i in items.find_all('a',class_="arrow_pag"):
        arrows.append(urlparse(i['href']).path)
      pages=[]
      for i in items.find_all('a',class_="inactive"):
        link=urlparse(i['href']).path
        name=i.get_text()
        pages.append({"link":link,"name":name})
      pagination["current"]=items.find('span',class_='current').get_text()
      pagination["count"]=items.find('span').get_text()
      pagination["pages"]=pages
      pagination["arrows"]=arrows
    except:
      pass
    
    data={"movies":movies,"pagination":pagination,"links":links,"name":title,"trendings":trendings}
    return JsonResponse(data)
#movie details
def allMoviesMovie(r,id):
    global domain
    req=requests.get(domain+"movies/"+id+"/")
    soup=bs(req.content,'html.parser')
    #details
    poster = title = extra = description = download = player  = director_details = ""

    try:
      poster=soup.find('div',class_='poster').img.get('src')
      title=soup.find('div',class_='data').h1.get_text()
      extra=soup.find('div',class_='extra').find_all('span')
      extra=' '.join([i.get_text() for  i in extra if i.get('class')[0]!="tagline"])
    except:
      pass
    #genres
    genre=[]
    try:
      for i in soup.find('div',class_='sgeneros').find_all('a'):
        link=urlparse(i['href']).path
        name=i.get_text()
        genre.append({"link":link,"name":name})
    except:
      pass
    download=[]
    try:
      notes=soup.find('div',itemprop="description")
      description=notes.p.get_text().replace("MovierulzHD","rsgmovies")
      for i in notes.find_all("a",class_='maxbutton-4'):
        download.append({"name":i.get_text(),"link":i['href']})
    except:
      pass
    #images
    images=[]
    try:
      gallery=soup.find('div',id='dt_galery').find_all('img')
      for i in gallery:
        images.append(i['src'])
    except:
      pass
    custom=[]
    try:
      for i in soup.find_all('div',class_='custom_fields'):
        name=i.b.get_text()
        desc=i.span.prettify()
        custom.append({"name":name,"description":desc})
    except:
      pass

    #movies
    parsed_url = urlparse(req.url)
    domain = f"{parsed_url.scheme}://{parsed_url.netloc}/"
    movies=[]
    try:
      items=soup.find_all('article')
      for  i in items:
        link=urlparse(i.find('a')['href']).path
        image=i.find('img')['src']
        movies.append({"image":image,"link":link})
    except:
      pass

    #cast
    try:  
      cast=soup.find('div',id='cast')
    except:
      pass
    #director
    try:
      director=cast.find('div',itemprop='director')
      link=urlparse(director.find('a')['href']).path
      image=director.find('img')['src']
      name=director.find('div',class_='name').get_text()
      desc=director.find('div',class_='caracter').get_text()
      director_details={"name":name,"image":image,"description":desc,"link":link}
    except:
      pass
    #actors
    actors=[]
    try:
      for i in cast.find_all('div',itemprop='actor'):
        link=urlparse(i.find('a')['href']).path
        image=i.find('img')['src']
        name=i.find('div',class_='name').get_text()
        desc=i.find('div',class_='caracter').get_text()
        actors.append({"name":name,"image":image,"description":desc,"link":link})
    except:
      pass
    #links
    players=[]
    try:
      items=soup.find_all('li',class_="dooplay_player_option")
      for i in items:
        players.append({"name":i.find('span',class_="title").get_text(),"id":i["data-post"],"num":i["data-nume"],"type":i["data-type"]})
    except:
      pass
    try:
      response = requests.post(f'{domain}wp-admin/admin-ajax.php', data={'action': 'doo_player_ajax','post': players[0]["id"],'nume': '1','type': 'movie'})
      player=response.json()["embed_url"]
    except:
      pass
    
    data={"name":title,"image":poster,"extra":extra,"genre":genre,"description":description,"download":download,"player":player,"players":players,"images":images,"custom":custom,"director":director_details,"actors":actors,"movies":movies}
    return JsonResponse(data)
def allMoviestvshows(r,id):
  #tvshows
  req=requests.get(domain+"tvshows/"+id+"/")
  soup=bs(req.content,'html.parser')
  #details
  poster = title = extra = description  = trailer  = director_details = ""

  try:
    poster=soup.find('div',class_='poster').img.get('src')
    title=soup.find('div',class_='data').h1.get_text()
    extra=soup.find('span',itemprop="dateCreated").get_text()
  except:
    pass
  #genres
  genre=[]
  try:
    for i in soup.find('div',class_='sgeneros').find_all('a'):
      link=urlparse(i['href']).path
      name=i.get_text()
      genre.append({"link":link,"name":name})
  except:
    pass
  #synposis
  try:
    notes=soup.find('div',class_="wp-content")
    description=notes.get_text(separator='\n').replace("MovierulzHD","rsgmovies")
  except:
    pass
  #images
  images=[]
  try:
    gallery=soup.find('div',id='dt_galery').find_all('img')
    for i in gallery:
      images.append(i['src'])
  except:
    pass
  custom=[]
  try:
    for i in soup.find_all('div',class_='custom_fields'):
      name=i.b.get_text()
      desc=i.span.prettify()
      custom.append({"name":name,"description":desc})
  except:
    pass

  #movies
  movies=[]
  try:
    items=soup.find_all('article')
    for  i in items:
      link=urlparse(i.find('a')['href']).path
      image=i.find('img')['src']
      movies.append({"image":image,"link":link})
  except:
    pass

  #cast
  try:
    cast=soup.find('div',id='cast')
  except:
    pass
  #director
  try:
    director=cast.find('div',class_='person')
    link=urlparse(director.find('a')['href']).path
    image=director.find('img')['src']
    name=director.find('div',class_='name').get_text()
    desc=director.find('div',class_='caracter').get_text()
    director_details={"name":name,"image":image,"description":desc,"link":link}
  except:
    pass
  #actors
  actors=[]
  try:
    for i in cast.find_all('div',itemprop='actor'):
      link=urlparse(i.find('a')['href']).path
      image=i.find('img')['src']
      name=i.find('div',class_='name').get_text()
      desc=i.find('div',class_='caracter').get_text()
      actors.append({"name":name,"image":image,"description":desc,"link":link})
  except:
    pass
  #seasons
  seasons_data=[]
  seasons=soup.find_all('div',class_='se-c')
  for i in seasons:
    eposides=i.find_all('li')
    eposides_data=[]
    for j in eposides:
      link=urlparse(j.a['href']).path
      name=j.a.get_text()
      image=j.img['src']
      date=j.find('span',class_="date").get_text()
      numerando=j.find('div',class_="numerando").get_text()
      eposides_data.append({"link":link,"name":name,"image":image,"date":date,"number":numerando})
    ss=i.find('span',class_="title").get_text(separator="  ")
    seasons_data.append({"name":ss,"episodes":eposides_data})
  #trailer
  try:
    trailer=soup.find('iframe')['src']
  except:
    pass
  data={"name":title,"image":poster,"extra":extra,"genre":genre,"description":description,"images":images,"custom":custom,"director":director_details,"actors":actors,"movies":movies,"trailer":trailer,"seasons":seasons_data}

  return JsonResponse(data)
def allMoviesEpisodes(r,id):
  #episodes
  req=requests.get(domain+"episodes/"+id+"/")
  soup=bs(req.content,'html.parser')
  #details
  title = description = ""
  try:
    title=soup.find('div',id='info').h1.get_text()
  except:
    pass

  #synposis
  download=[]
  try:
    notes=soup.find('div',itemprop="description")
    description=notes.p.get_text().replace("MovierulzHD","rsgmovies")
    for i in notes.find_all("a",class_='maxbutton-4'):
      download.append({"name":i.get_text(),"link":i['href']})
  except:
    pass
  #images
  images=[]
  try:
    gallery=soup.find('div',id='dt_galery').find_all('img')
    for i in gallery:
      images.append(i['src'])
  except:
    pass

  #links
  players=[]

  try:
    items=soup.find_all('li',class_="dooplay_player_option")
    for i in items:
      players.append({"name":i.find('span',class_="title").get_text(),"id":i["data-post"],"num":i["data-nume"],"type":i["data-type"]})
  except:
    pass
  try:
    response = requests.post(domain+'/wp-admin/admin-ajax.php', data={'action': 'doo_player_ajax','post': players[0]["id"],'nume': players[0]["num"],'type': players[0]["type"]})
    player=response.json()["embed_url"]
  except:
    pass
  #movies
  movies=[]
  try:
    items=soup.find_all('article')
    for  i in items:
      link=urlparse(i.find('a')['href']).path
      image=i.find('img')['src']
      movies.append({"image":image,"link":link})
  except:
    pass
  #pages
  pages=[]
  try:
    items=soup.find('div',class_="pag_episodes").find_all('a')
    for  i in items:
      link=urlparse(i['href']).path
      image=' '.join(j for j in i.find('i')['class'])
      name=i.get_text()
      pages.append({"image":image,"link":link,"name":name})
  except:
    pass

  #seasons
  seasons_data=[]
  seasons=soup.find_all('div',class_='se-c')
  for i in seasons:
    eposides=i.find_all('li')
    eposides_data=[]
    for j in eposides:
      link=urlparse(j.a['href']).path
      name=j.a.get_text()
      image=j.img['src']
      date=j.find('span',class_="date").get_text()
      numerando=j.find('div',class_="numerando").get_text()
      eposides_data.append({"link":link,"name":name,"image":image,"date":date,"number":numerando})
    seasons_data.append({"episodes":eposides_data})
 
  data={"name":title,"description":description,"images":images,"movies":movies,"download":download,"players":players,"player":player,"seasons":seasons_data,"pages":pages}
  return JsonResponse(data)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from react.serializers import PlayerSerializer
@api_view(["POST"])
def fetchPlayer(r):
  serializer=PlayerSerializer(data=r.data)
  if serializer.is_valid():
    try:
      req=requests.post(f'{domain}wp-admin/admin-ajax.php', data={'action': 'doo_player_ajax','post': serializer.data["id"],'nume': serializer.data["num"],'type':serializer.data["type"]})
      player=req.json()
      if player["embed_url"]:
        return Response({"link":player["embed_url"]})
      raise Exception
    except :
      return Response({"error":"Failed to get results"},status=status.HTTP_400_BAD_REQUEST)
  return Response({"error":"Failed to get results"},status=status.HTTP_400_BAD_REQUEST)
    
