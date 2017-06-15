FPF_STATISTICS = {};

// -------------------

FPF_STATISTICS.get_min = function (arr) {
  return arr.reduce(function (p, v) {
    return ( p < v ? p : v );
  });
};

FPF_STATISTICS.get_max = function (arr) {
  return arr.reduce(function (p, v) {
    return ( p > v ? p : v );
  });
};

// ------------------------------

FPF_STATISTICS.float_to_fixed = function(_float, _fixed) {
    var _place = 1;
    for (var _i = 0; _i < _fixed; _i++) {
            _place = _place * 10;
    }
    return Math.round(_float * _place) / _place;
};

FPF_STATISTICS.stat_avg = function(_ary) {
    var sum = _ary.reduce(function(a, b) { return a + b; });
    var avg = sum / _ary.length;
    return avg;
};

FPF_STATISTICS.stat_stddev = function (_ary) {
   var i,j,total = 0, mean = 0, diffSqredArr = [];
   for(i=0;i<_ary.length;i+=1){
       total+=_ary[i];
   }
   mean = total/_ary.length;
   for(j=0;j<_ary.length;j+=1){
       diffSqredArr.push(Math.pow((_ary[j]-mean),2));
   }
   return (Math.sqrt(diffSqredArr.reduce(function(firstEl, nextEl){
            return firstEl + nextEl;
          })/_ary.length));
};