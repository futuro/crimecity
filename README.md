crimecity
=========

Visualizing Crime Statistics in a Geographical Context

Using
=====

(From https://github.com/mbostock/d3/wiki)
When developing locally, note that your browser may enforce strict permissions
for reading files out of the local file system. If you use d3.xhr locally
(including d3.json et al.), you must have a local web server. For example,
you can run Python's built-in server:

python -m SimpleHTTPServer 8888 &

or for Python 3+

python -m http.server 8888 &

If you have have PHP installed you could try

php -S localhost:8888

or if you are running Ruby you can use

ruby -run -e httpd . -p 8888

Once this is running, go to http://localhost:8888/.

or if you are running nodejs you can do

npm install http-server -g http-server

Another option is to start a local jetty instance, by using the jetty-runner
library with the JVM already installed on your system. In order to achieve this
you'll need to download jetty-runner, then you can simply do:

java -jar jetty-runner-9.3.0.M0.jar  --port 8080  .

and this will start the server on http://localhost:8080 as usual from the
current directory, or a different directory, simply changing '.' to the path to
that directory.
